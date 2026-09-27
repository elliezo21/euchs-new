<template>
  <div ref="rootRef" class="studio-root st-dark st-land" :class="{ 'is-static': isStatic }" data-studio-landing>
    <!-- 상단 바 -->
    <header class="st-land-nav">
      <div class="st-land-wrap h-full flex items-center gap-3">
        <router-link :to="{ name: 'studio-landing' }" class="flex items-center gap-2.5 shrink-0">
          <span class="st-land-logo"><Sparkles class="w-4 h-4" :stroke-width="2.2" /></span>
          <span class="text-[15px] font-extrabold st-ink whitespace-nowrap">EUCHS Studio</span>
        </router-link>
        <div class="ml-auto flex items-center gap-1 sm:gap-2">
          <router-link v-if="currentUser" :to="{ name: 'studio-projects' }" class="st-btn st-btn-ghost">내 작업</router-link>
          <button v-else type="button" class="st-btn st-btn-ghost" @click="openLoginModal('login')">로그인</button>
          <button type="button" class="st-btn st-land-cta-sm" data-land-start @click="start">무료로 시작하기</button>
        </div>
      </div>
    </header>

    <!-- ① 히어로 -->
    <section class="st-land-hero">
      <div class="st-land-glow" aria-hidden="true"><span class="g1" /><span class="g2" /><span class="g3" /></div>
      <div class="st-land-grid" aria-hidden="true" />
      <div class="st-land-wrap relative grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <div class="st-land-kicker" data-hero-in><span class="dot" />1688 상세페이지 제작 스튜디오</div>
          <h1 class="st-land-h1 mt-5">
            <span class="block" data-hero-in>1688 상품 사진,</span>
            <span class="block" data-hero-in>한국 <em>상세페이지</em>로</span>
          </h1>
          <p class="st-land-lead mt-6" data-hero-in>
            중국어 문구는 AI가 지우고, 배경은 바꾸고, 페이지 배치와 글자 초안까지 만들어요.
            고치고 싶은 곳만 직접 다듬으면 돼요.
          </p>
          <div class="mt-8 flex flex-wrap gap-3" data-hero-in>
            <button type="button" class="st-btn st-land-cta" data-land-start @click="start">
              무료로 시작하기 <ArrowRight class="w-[18px] h-[18px]" :stroke-width="2.5" />
            </button>
            <button type="button" class="st-btn st-land-ghost" @click="scrollToScenes">
              <Play class="w-4 h-4" :stroke-width="2.5" /> 어떻게 되는지 보기
            </button>
          </div>
          <ul class="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] st-ink-2" data-hero-in>
            <li class="flex items-center gap-1.5"><Check class="w-4 h-4 st-land-ai-text" :stroke-width="2.5" />원본 사진은 그대로 보관</li>
            <li class="flex items-center gap-1.5"><Check class="w-4 h-4 st-land-ai-text" :stroke-width="2.5" />설치 없이 브라우저에서</li>
            <li class="flex items-center gap-1.5"><Check class="w-4 h-4 st-land-ai-text" :stroke-width="2.5" />JPG·PNG로 내보내기</li>
          </ul>
        </div>

        <!-- 전후 비교 반복 -->
        <div class="st-land-hero-visual" data-hero-visual>
          <div class="st-land-frame st-land-ba">
            <img :src="M.hero.after" :alt="M.hero.alt" width="800" height="800" decoding="async" fetchpriority="high" />
            <img :src="M.hero.before" alt="" width="800" height="800" decoding="async" class="ba-top" aria-hidden="true" />
            <div class="ba-line" aria-hidden="true"><span /></div>
            <span class="st-land-tag ba-tag-before">원본</span>
            <span class="st-land-tag ba-tag-after is-ai"><Sparkles class="w-3.5 h-3.5" :stroke-width="2.4" />AI로 지움</span>
          </div>
          <div class="st-land-float f1" aria-hidden="true"><Wand2 class="w-4 h-4" :stroke-width="2.2" />글자 찾기</div>
          <div class="st-land-float f2" aria-hidden="true"><Layers class="w-4 h-4" :stroke-width="2.2" />배경 바꾸기</div>
        </div>
      </div>
    </section>

    <!-- ② 글자 지우기 -->
    <section ref="firstSceneRef" class="st-land-scene" data-scene="erase">
      <div class="st-land-wrap grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div class="st-land-copy">
          <div class="st-land-num">01 · AI 글자 지우기</div>
          <h2 class="st-land-h2">사진 속 중국어 문구,<br />AI가 찾아서 지워요</h2>
          <p class="st-land-p">원클릭은 글자를 스스로 찾아 지우고, 편집기에서는 지울 곳만 칠하면 돼요. 지운 자리는 주변과 어울리게 채워요.</p>
        </div>
        <div class="st-land-frame st-land-erase">
          <img :src="M.erase.after" :alt="M.erase.alt" width="800" height="800" loading="lazy" decoding="async" />
          <img :src="M.erase.before" alt="" width="800" height="800" loading="lazy" decoding="async" class="erase-top" data-erase-top aria-hidden="true" />
          <span
            v-for="(b, i) in M.erase.boxes" :key="i" class="erase-box" data-erase-box aria-hidden="true"
            :style="{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }"
          />
          <div class="erase-line" data-erase-line aria-hidden="true"><span /></div>
          <span class="st-land-tag erase-done is-ai" data-erase-done><Check class="w-3.5 h-3.5" :stroke-width="2.6" />원본은 그대로, 지운 결과는 따로 저장</span>
        </div>
      </div>
    </section>

    <!-- ③ 배경 -->
    <section class="st-land-scene" data-scene="bg">
      <div class="st-land-wrap grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div class="st-land-frame st-land-bg md:order-1 order-2">
          <div class="bg-layer st-land-checker" aria-hidden="true" />
          <img :src="M.background.original" alt="" width="800" height="800" loading="lazy" decoding="async" class="bg-layer" data-bg-layer="orig" aria-hidden="true" />
          <div class="bg-layer" data-bg-layer="color" :style="{ background: M.background.solidColor }" aria-hidden="true" />
          <img :src="M.background.aiBackground" alt="" width="800" height="800" loading="lazy" decoding="async" class="bg-layer" data-bg-layer="ai" aria-hidden="true" />
          <img :src="M.background.cutout" :alt="M.background.alt" width="800" height="800" loading="lazy" decoding="async" class="bg-layer" data-bg-layer="cut" />
        </div>
        <div class="st-land-copy md:order-2 order-1">
          <div class="st-land-num">02 · 배경 바꾸기</div>
          <h2 class="st-land-h2">제품은 원본 그대로,<br />배경만 바뀝니다</h2>
          <p class="st-land-p">배경을 지워 투명하게 두거나, 단색이나 AI가 만든 장면으로 바꿔요. 경계는 붓으로 직접 다듬을 수 있어요.</p>
          <ol class="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <li v-for="(s, i) in BG_STEPS" :key="s" class="st-land-step" data-bg-step :style="{ '--on': i === BG_STEPS.length - 1 ? 1 : 0 }">
              <span class="hl" aria-hidden="true" /><span class="relative">{{ s }}</span>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- ④ 원클릭 -->
    <section class="st-land-scene" data-scene="oneclick">
      <div class="st-land-wrap grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div class="st-land-copy">
          <div class="st-land-num">03 · 원클릭 AI 자동 제작</div>
          <h2 class="st-land-h2">사진만 넣으면,<br />페이지 초안까지 한 번에</h2>
          <p class="st-land-p">사진을 고르고, 중국어를 지우고, 긴 상세페이지로 배치한 뒤 1688 상품 정보로 글자 초안을 적어요.</p>
          <ol class="mt-7 space-y-2.5">
            <li v-for="(s, i) in OC_STEPS" :key="s" class="st-land-ocstep" data-oc-step>
              <span class="n">{{ i + 1 }}</span><span>{{ s }}</span><Check class="w-4 h-4 ml-auto chk" :stroke-width="2.6" />
            </li>
          </ol>
          <div class="st-land-bar mt-5" aria-hidden="true"><span data-oc-bar /></div>
          <p class="mt-3 text-[12px] st-muted">실측: 머리띠 사진 14장 · 약 1분 30초 (첫 실행 AI 준비 포함, 2026-09-27)</p>
        </div>
        <div class="st-land-ocstage">
          <div class="st-land-page">
            <div class="oc-title" data-oc-title aria-hidden="true"><span class="w-3/4" /><span class="w-1/2" /></div>
            <div v-for="(p, i) in M.oneClick.photos" :key="i" class="oc-card" data-oc-card>
              <img :src="p.after" alt="" width="800" height="800" loading="lazy" decoding="async" />
              <img :src="p.before" alt="" width="800" height="800" loading="lazy" decoding="async" class="oc-before" data-oc-before />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑤ 편집 -->
    <section class="st-land-scene" data-scene="editor">
      <div class="st-land-wrap grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-10 md:gap-14 items-center">
        <div class="st-land-copy">
          <div class="st-land-num">04 · 편집기</div>
          <h2 class="st-land-h2">마음에 안 드는 곳만<br />직접 고치세요</h2>
          <p class="st-land-p">자동으로 만든 페이지 위에서 지우기·자르기·템플릿·필터·글자를 바로 써요. 되돌리기와 자동 저장도 함께예요.</p>
        </div>
        <div class="st-land-edstage">
          <div class="st-land-win" data-ed-win>
            <div class="win-bar" aria-hidden="true"><i /><i /><i /><span>상세페이지 편집</span></div>
            <div class="win-body">
              <ul class="win-tools">
                <li v-for="(t, i) in ED_TOOLS" :key="t.label" class="win-tool" data-ed-tool :style="{ '--on': i === ED_TOOLS.length - 1 ? 1 : 0 }">
                  <span class="hl" aria-hidden="true" />
                  <component :is="t.icon" class="relative w-[18px] h-[18px]" :stroke-width="2" />
                  <span class="relative">{{ t.label }}</span>
                </li>
              </ul>
              <div class="win-canvas">
                <div class="win-sheet">
                  <img :src="M.editor.photo" alt="" width="800" height="800" loading="lazy" decoding="async" />
                  <div class="sheet-text" aria-hidden="true"><span class="w-2/3" /><span class="w-1/2" /></div>
                </div>
                <div class="win-caps">
                  <span
                    v-for="(t, i) in ED_TOOLS" :key="t.label" class="win-cap" data-ed-cap
                    :style="{ opacity: i === ED_TOOLS.length - 1 ? 1 : 0 }"
                  ><component :is="t.icon" class="w-4 h-4" :stroke-width="2.2" />{{ t.cap }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑥ 내보내기 -->
    <section class="st-land-scene" data-scene="export">
      <div class="st-land-wrap grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div class="st-land-copy md:order-2">
          <div class="st-land-num">05 · 내보내기</div>
          <h2 class="st-land-h2">완성한 페이지를<br />판매처에 올릴 이미지로</h2>
          <p class="st-land-p">구간별 여러 장 또는 한 장으로 길게, JPG·PNG로 받아요. 받은 파일은 쓰시는 판매처에 그대로 올리면 돼요.</p>
        </div>
        <div class="st-land-exstage md:order-1">
          <div class="ex-page" data-ex-page>
            <div class="ex-head" aria-hidden="true"><span class="w-2/3" /><span class="w-2/5" /></div>
            <img v-for="(src, i) in M.export.pagePhotos" :key="i" :src="src" alt="" width="800" height="800" loading="lazy" decoding="async" />
            <span class="ex-origin" data-ex-origin aria-hidden="true" />
            <span v-for="(m, i) in MARKETS" :key="`s${i}`" class="ex-sheet" data-ex-sheet aria-hidden="true">
              <img :src="M.export.pagePhotos[0]" alt="" width="800" height="800" loading="lazy" decoding="async" />
            </span>
          </div>
          <ul class="ex-markets">
            <li v-for="m in MARKETS" :key="m" class="ex-market" data-ex-market>
              <span class="hl" aria-hidden="true" />
              <span class="relative">{{ m }}</span>
              <Check class="relative w-4 h-4 ml-auto chk" :stroke-width="2.6" />
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ⑦ 혜택 -->
    <section class="st-land-plain">
      <div class="st-land-wrap">
        <div class="text-center" data-reveal>
          <div class="st-land-num justify-center">이용 안내</div>
          <h2 class="st-land-h2">이유씨컴퍼니 고객이라면<br class="sm:hidden" /> 지금 바로 무료로</h2>
        </div>
        <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[920px] mx-auto">
          <div class="st-land-card is-main" data-reveal>
            <span class="st-land-badge">무료</span>
            <h3 class="mt-4 text-[22px] font-extrabold st-ink">이유씨컴퍼니 주문 고객</h3>
            <p class="mt-2 st-land-p !mt-2">이유씨컴퍼니에서 주문한 고객은 스튜디오를 무료로 쓸 수 있어요.</p>
            <ul class="mt-5 space-y-2.5 text-[14px] st-ink">
              <li v-for="f in FREE_FEATURES" :key="f" class="flex items-start gap-2"><Check class="w-4 h-4 mt-0.5 st-land-ai-text shrink-0" :stroke-width="2.6" />{{ f }}</li>
            </ul>
          </div>
          <div class="st-land-card" data-reveal>
            <span class="st-land-badge is-soon">곧 열려요</span>
            <h3 class="mt-4 text-[22px] font-extrabold st-ink">일반 셀러</h3>
            <p class="mt-2 st-land-p !mt-2">주문 이력이 없는 셀러도 쓸 수 있도록 준비하고 있어요. 열리면 이 페이지에서 먼저 알려 드릴게요.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑧ 마지막 안내 -->
    <section class="st-land-final">
      <div class="st-land-glow is-final" aria-hidden="true"><span class="g1" /><span class="g2" /></div>
      <div class="st-land-wrap relative text-center" data-reveal>
        <h2 class="st-land-h2 !text-[clamp(30px,5vw,56px)]">사진 한 장으로<br />지금 시작해 보세요</h2>
        <p class="st-land-p mx-auto max-w-[520px]">찜한 상품, 주문한 상품, 내가 찍은 사진 어디서든 시작할 수 있어요.</p>
        <div class="mt-9 flex flex-wrap justify-center gap-3">
          <button type="button" class="st-btn st-land-cta" data-land-start @click="start">
            무료로 시작하기 <ArrowRight class="w-[18px] h-[18px]" :stroke-width="2.5" />
          </button>
          <a :href="KAKAO_CHAT" target="_blank" rel="noopener noreferrer" class="st-btn st-land-ghost">
            <MessageCircle class="w-4 h-4" :stroke-width="2.4" /> 카카오톡으로 문의하기
          </a>
        </div>
      </div>
      <footer class="st-land-wrap relative mt-24 pt-6 st-border-t flex flex-wrap items-center gap-3 text-[12px] st-muted">
        <span>© 이유씨컴퍼니 (EUCHS)</span>
        <router-link to="/" class="st-link-muted ml-auto">이유씨컴퍼니 메인으로</router-link>
      </footer>
    </section>
  </div>
</template>

<script setup>
// 스튜디오 랜딩(/studio) — 로그인 없이 누구나 본다. 작업(최근 작업·새 소식)은 /studio/projects(작업 홈)에서.
// 모션은 studioLandingMotion.js(GSAP)를 여기서만 동적 import — 편집기·ERP 번들에 섞이지 않는다.
// 기본 화면(CSS) = 장면이 끝난 모습 → 움직임 줄이기 설정·불러오기 실패여도 내용은 다 보인다.
// 개인 데이터를 보여 주지 않는 화면이라 로그아웃 구독은 필요 없다(버튼만 currentUser로 바뀜).
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight, Play, Check, Sparkles, Wand2, Layers, MessageCircle,
  Eraser, Crop, LayoutTemplate, SlidersHorizontal, Type,
} from 'lucide-vue-next'
import { currentUser, openLoginModal } from '@/lib/auth'
import { LANDING_MEDIA as M } from '@/data/studioLandingMedia'

const router = useRouter()
const rootRef = ref(null)
const firstSceneRef = ref(null)
const isStatic = ref(false)

const KAKAO_CHAT = 'http://pf.kakao.com/_xmQWsK/chat' // Footer·CommunitySection과 같은 상담 채널
const BG_STEPS = ['원래 배경', '투명', '단색', 'AI 배경']
const OC_STEPS = ['사진 고르기', '글자 지우기', '페이지 배치', '글자 초안']
const ED_TOOLS = [
  { label: '지우기', icon: Eraser, cap: '지울 곳만 칠하면 깨끗하게' },
  { label: '자르기', icon: Crop, cap: '필요한 부분만 잘라 쓰기' },
  { label: '템플릿', icon: LayoutTemplate, cap: '템플릿으로 배치를 한 번에' },
  { label: '필터', icon: SlidersHorizontal, cap: '밝기·색감 조정' },
  { label: '글자', icon: Type, cap: '한글 문구 올리기' },
]
const MARKETS = ['쿠팡', '카페24', '고도몰', '메이크샵']
const FREE_FEATURES = ['AI 글자 지우기·덮기', '배경 지우기·단색·경계 다듬기', 'AI 배경 만들기 (하루 3회)', '원클릭 AI 자동 제작', '구간별·한 장 내보내기']

// [무료로 시작하기] = 작업 홈으로. 로그인 전이면 기존 라우터 가드가 복귀 주소를 기억하고 로그인 창을 연다(구글·카카오 로그인도 같은 규칙)
function start() {
  router.push({ name: 'studio-projects' })
}

function scrollToScenes() {
  firstSceneRef.value?.scrollIntoView({ behavior: isStatic.value ? 'auto' : 'smooth', block: 'start' })
}

let stopMotion = null
let alive = true
onMounted(async () => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce) { isStatic.value = true; return }
  try {
    const { startLandingMotion } = await import('@/lib/studioLandingMotion')
    if (!alive || !rootRef.value) return
    stopMotion = startLandingMotion(rootRef.value)
  } catch (e) {
    console.error('[StudioLanding] 모션을 불러오지 못해 정지 화면으로 보여요:', e)
    isStatic.value = true
  }
})
onBeforeUnmount(() => {
  alive = false
  stopMotion?.()
  stopMotion = null
})
</script>

<style scoped>
/* 색은 .studio-root.st-dark 토큰(--st-*)만. 새 값은 체크무늬 회색 두 개뿐 */
.st-land {
  --land-checker-a: #2a2d33;
  --land-checker-b: #1f2126;
  --land-wrap: 1200px;
  min-height: 100vh;
  overflow-x: clip;
  background: var(--st-bg);
}
.st-land-wrap { max-width: var(--land-wrap); margin-left: auto; margin-right: auto; padding: 0 20px; } /* 위아래 여백은 Tailwind mt-*가 쓰게 */
@media (min-width: 768px) { .st-land-wrap { padding: 0 40px; } }

/* 상단 바 — 블러 없이 반투명 단색 */
.st-land-nav {
  position: fixed; inset: 0 0 auto 0; z-index: 40; height: 64px;
  background: color-mix(in srgb, var(--st-bg) 86%, transparent);
  border-bottom: 1px solid var(--st-line);
}
.st-land-logo {
  width: 30px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--st-ai); color: var(--st-ai-text);
}
.st-land-cta-sm { background: var(--st-ai) !important; border-color: var(--st-ai) !important; color: var(--st-ai-text) !important; }
@media (max-width: 400px) { .st-land-nav .st-btn { height: 34px; padding: 0 10px; font-size: 13px; } }

/* 버튼 */
.st-land-cta {
  height: 54px; padding: 0 26px; border-radius: 14px; font-size: 16px; font-weight: 800;
  background: var(--st-ai) !important; border-color: var(--st-ai) !important; color: var(--st-ai-text) !important;
  box-shadow: 0 10px 30px color-mix(in srgb, var(--st-ai) 28%, transparent);
  transition: transform 0.2s, filter 0.2s;
}
.st-land-cta:hover { transform: translateY(-2px); filter: brightness(1.05); }
.st-land-ghost { height: 54px; padding: 0 22px; border-radius: 14px; font-size: 15px; background: transparent !important; border-color: var(--st-line-strong); }
.st-land-ghost:hover { background: var(--st-card) !important; }
.st-land-ai-text { color: var(--st-ai); }

/* 히어로 */
.st-land-hero { position: relative; padding: 140px 0 110px; overflow: hidden; }
@media (min-width: 1024px) { .st-land-hero { min-height: 100vh; display: flex; align-items: center; padding: 110px 0 80px; } .st-land-hero > .st-land-wrap { width: 100%; } }
.st-land-kicker {
  display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 14px; border-radius: 999px;
  border: 1px solid var(--st-line-strong); background: var(--st-card); font-size: 13px; font-weight: 700; color: var(--st-ink-2);
}
.st-land-kicker .dot { width: 7px; height: 7px; border-radius: 99px; background: var(--st-ai); box-shadow: 0 0 0 4px color-mix(in srgb, var(--st-ai) 22%, transparent); }
.st-land-h1 {
  font-size: clamp(38px, 6.2vw, 76px); font-weight: 900; line-height: 1.08; letter-spacing: -0.045em; color: var(--st-ink); word-break: keep-all;
}
.st-land-h1 em {
  font-style: normal;
  background: linear-gradient(100deg, var(--st-ai) 10%, color-mix(in srgb, var(--st-ai) 55%, var(--st-accent)) 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.st-land-lead { font-size: clamp(16px, 1.5vw, 19px); line-height: 1.65; color: var(--st-ink-2); max-width: 560px; word-break: keep-all; }

/* 빛 움직임 — blur 대신 radial-gradient, transform만 움직임 */
.st-land-glow { position: absolute; inset: 0; pointer-events: none; }
.st-land-glow span { position: absolute; border-radius: 50%; will-change: transform; }
.st-land-glow .g1 { width: 780px; height: 780px; left: -220px; top: -260px; background: radial-gradient(closest-side, color-mix(in srgb, var(--st-ai) 26%, transparent), transparent); animation: land-drift 16s ease-in-out infinite alternate; }
.st-land-glow .g2 { width: 900px; height: 900px; right: -300px; top: 80px; background: radial-gradient(closest-side, color-mix(in srgb, var(--st-accent) 24%, transparent), transparent); animation: land-drift 20s ease-in-out -6s infinite alternate-reverse; }
.st-land-glow .g3 { width: 520px; height: 520px; left: 35%; bottom: -300px; background: radial-gradient(closest-side, color-mix(in srgb, var(--st-ai) 14%, transparent), transparent); animation: land-drift 24s ease-in-out -3s infinite alternate; }
/* 마지막 안내 빛 — 구간 위아래 끝에서 서서히 사라지게 (잘린 모서리가 안 보이게) */
.st-land-glow.is-final { mask-image: linear-gradient(transparent, #000 35%, #000 70%, transparent); -webkit-mask-image: linear-gradient(transparent, #000 35%, #000 70%, transparent); }
.st-land-glow.is-final .g1 { left: 10%; top: -120px; }
.st-land-glow.is-final .g2 { right: 5%; top: 0; }
@keyframes land-drift { from { transform: translate3d(0, 0, 0) scale(1); } to { transform: translate3d(80px, 50px, 0) scale(1.12); } }
.st-land-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--st-line) 1px, transparent 1px), linear-gradient(90deg, var(--st-line) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 75%);
}

/* 사진 틀 */
.st-land-frame {
  position: relative; aspect-ratio: 1 / 1; width: 100%; max-width: 560px; margin: 0 auto;
  border-radius: 24px; overflow: hidden; background: var(--st-card);
  border: 1px solid var(--st-line-strong);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45);
}
.st-land-frame > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.st-land-tag {
  position: absolute; display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border-radius: 999px;
  font-size: 12px; font-weight: 800; background: var(--st-scrim); color: #fff; z-index: 3;
}
.st-land-tag.is-ai { background: var(--st-ai); color: var(--st-ai-text); }

/* 히어로 전후 비교 — CSS 반복 (위 사진을 왼쪽부터 잘라 아래 사진이 드러남) */
.st-land-hero-visual { position: relative; }
.st-land-ba .ba-top { animation: land-ba 6.5s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
.st-land-ba .ba-line { position: absolute; inset: 0; z-index: 2; pointer-events: none; animation: land-ba-line 6.5s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
.st-land-ba .ba-line span, .st-land-erase .erase-line span {
  position: absolute; top: 0; bottom: 0; left: -2px; width: 4px; border-radius: 4px; background: var(--st-ai);
  box-shadow: 0 0 24px 6px color-mix(in srgb, var(--st-ai) 55%, transparent);
}
.ba-tag-before { left: 16px; top: 16px; animation: land-tag-before 6.5s infinite; }
.ba-tag-after { right: 16px; top: 16px; animation: land-tag-after 6.5s infinite; }
@keyframes land-ba {
  0%, 16% { clip-path: inset(0 0 0 0%); opacity: 1; }
  48% { clip-path: inset(0 0 0 100%); opacity: 1; }
  82% { clip-path: inset(0 0 0 100%); opacity: 0; }
  83% { clip-path: inset(0 0 0 0%); opacity: 0; }
  100% { clip-path: inset(0 0 0 0%); opacity: 1; }
}
@keyframes land-ba-line {
  0%, 15% { transform: translateX(0); opacity: 0; }
  17% { transform: translateX(0); opacity: 1; }
  47% { transform: translateX(100%); opacity: 1; }
  50%, 100% { transform: translateX(100%); opacity: 0; }
}
@keyframes land-tag-before { 0%, 40% { opacity: 1; } 48%, 90% { opacity: 0; } 100% { opacity: 1; } }
@keyframes land-tag-after { 0%, 44% { opacity: 0; } 52%, 82% { opacity: 1; } 90%, 100% { opacity: 0; } }
.st-land-float {
  position: absolute; display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 12px;
  background: var(--st-panel); border: 1px solid var(--st-line-strong); color: var(--st-ink); font-size: 13px; font-weight: 800;
  box-shadow: var(--st-shadow-float); animation: land-bob 5s ease-in-out infinite alternate; z-index: 5;
}
.st-land-float svg { color: var(--st-ai); }
.st-land-float.f1 { left: -8px; bottom: 18%; }
.st-land-float.f2 { right: -8px; top: 14%; animation-delay: -2.5s; }
@media (min-width: 1024px) { .st-land-float.f1 { left: -36px; } .st-land-float.f2 { right: -30px; } }
@keyframes land-bob { from { transform: translateY(0); } to { transform: translateY(-12px); } }

/* 장면 공통 — 넓은 화면은 한 화면 높이(고정되는 동안 가운데) */
.st-land-scene { position: relative; padding: 90px 0; }
@media (min-width: 768px) { .st-land-scene { min-height: 100vh; display: flex; align-items: center; padding: 96px 0 48px; } .st-land-scene > .st-land-wrap { width: 100%; } }
.st-land-num { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; letter-spacing: 0.02em; color: var(--st-ai); }
.st-land-h2 { margin-top: 14px; font-size: clamp(28px, 3.8vw, 48px); font-weight: 900; line-height: 1.15; letter-spacing: -0.04em; color: var(--st-ink); word-break: keep-all; }
.st-land-p { margin-top: 18px; font-size: clamp(15px, 1.25vw, 17px); line-height: 1.7; color: var(--st-ink-2); word-break: keep-all; }

/* ② 지우기 */
.st-land-erase .erase-top { z-index: 1; clip-path: inset(0 0 0 100%); }
.st-land-erase .erase-box {
  position: absolute; z-index: 2; border: 2px solid var(--st-ai); border-radius: 8px; opacity: 0;
  background: color-mix(in srgb, var(--st-ai) 14%, transparent);
}
.st-land-erase .erase-line { position: absolute; inset: 0; z-index: 3; pointer-events: none; opacity: 0; }
.st-land-erase .erase-done { left: 16px; bottom: 16px; }

/* ③ 배경 */
.st-land-bg .bg-layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.st-land-checker {
  background-color: var(--land-checker-b);
  background-image: conic-gradient(var(--land-checker-a) 25%, transparent 0 50%, var(--land-checker-a) 0 75%, transparent 0);
  background-size: 32px 32px;
}
.st-land-step {
  position: relative; display: flex; align-items: center; justify-content: center; height: 44px; border-radius: 12px; overflow: hidden;
  border: 1px solid var(--st-line-strong); font-size: 14px; font-weight: 800; color: var(--st-ink);
}
.st-land-step .hl, .win-tool .hl, .ex-market .hl { position: absolute; inset: 0; opacity: var(--on, 1); }
.st-land-step .hl { background: var(--st-ai); }
.st-land-step > span:last-child { color: color-mix(in srgb, var(--st-ai-text) calc(var(--on, 1) * 100%), var(--st-ink)); }

/* ④ 원클릭 */
.st-land-ocstep {
  --on: 1; display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 16px; border-radius: 12px;
  background: var(--st-card); border: 1px solid var(--st-line); font-size: 15px; font-weight: 700;
  color: color-mix(in srgb, var(--st-ink) calc(40% + var(--on) * 60%), transparent);
}
.st-land-ocstep .n {
  width: 24px; height: 24px; border-radius: 99px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900;
  background: color-mix(in srgb, var(--st-ai) calc(var(--on) * 100%), var(--st-card-hover)); color: var(--st-ai-text);
}
.st-land-ocstep .chk { color: var(--st-ai); opacity: var(--on); }
.st-land-bar { height: 6px; border-radius: 99px; background: var(--st-card-hover); overflow: hidden; }
.st-land-bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--st-ai), color-mix(in srgb, var(--st-ai) 60%, var(--st-accent))); transform-origin: left center; }
.st-land-ocstage { display: flex; justify-content: center; }
.st-land-page {
  width: min(250px, 62vw); padding: 12px; border-radius: 20px; background: #fff; display: flex; flex-direction: column; gap: 8px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5);
}
.st-land-page .oc-title, .ex-head, .sheet-text { display: flex; flex-direction: column; gap: 6px; padding: 4px 2px 6px; }
.st-land-page .oc-title span, .ex-head span, .sheet-text span { display: block; height: 9px; border-radius: 99px; background: #e4e4e7; }
.st-land-page .oc-title span:first-child, .ex-head span:first-child, .sheet-text span:first-child { background: #27272a; height: 11px; }
.oc-card { position: relative; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden; background: #f4f4f5; }
@media (min-width: 768px) and (max-height: 820px) { .oc-card { aspect-ratio: 2 / 1; } }
.oc-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.oc-card .oc-before { opacity: 0; }

/* ⑤ 편집 */
.st-land-edstage { perspective: 1400px; }
.st-land-win {
  border-radius: 18px; overflow: hidden; background: var(--st-bar); border: 1px solid var(--st-line-strong);
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.55); transform-origin: 50% 100%;
}
.win-bar { display: flex; align-items: center; gap: 7px; height: 40px; padding: 0 14px; border-bottom: 1px solid var(--st-line); font-size: 12px; font-weight: 700; color: var(--st-muted); }
.win-bar i { width: 10px; height: 10px; border-radius: 99px; background: var(--st-card-hover); }
.win-bar span { margin-left: 8px; }
.win-body { display: flex; min-height: 360px; }
.win-tools { width: 88px; padding: 10px 8px; display: flex; flex-direction: column; gap: 4px; border-right: 1px solid var(--st-line); background: var(--st-panel); }
.win-tool {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 0; border-radius: 10px; overflow: hidden;
  font-size: 11px; font-weight: 700; color: var(--st-ink-2);
}
.win-tool .hl { background: var(--st-accent-soft); box-shadow: inset 0 0 0 1px var(--st-accent); border-radius: 10px; }
.win-tool svg { color: color-mix(in srgb, var(--st-accent) calc(var(--on, 1) * 100%), var(--st-ink-2)); }
.win-canvas { position: relative; flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--st-bg); }
.win-sheet { width: min(230px, 100%); padding: 10px; border-radius: 12px; background: #fff; }
.win-sheet img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 8px; display: block; }
.win-caps { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); width: max-content; max-width: calc(100% - 24px); height: 36px; }
.win-cap {
  position: absolute; left: 50%; top: 0; transform: translateX(-50%); white-space: nowrap;
  display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 999px;
  background: var(--st-ai); color: var(--st-ai-text); font-size: 13px; font-weight: 800;
}
@media (max-width: 767px) { .win-tools { width: 64px; } .win-tool { font-size: 10px; } .win-body { min-height: 300px; } .win-canvas { padding: 16px 12px 60px; } }

/* ⑥ 내보내기 */
.st-land-exstage { display: flex; align-items: center; justify-content: center; gap: 28px; }
@media (max-width: 767px) { .st-land-exstage { flex-direction: column; gap: 22px; } }
.ex-page {
  position: relative; width: min(200px, 48vw); padding: 10px; border-radius: 16px; background: #fff; display: flex; flex-direction: column; gap: 8px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5);
}
.ex-page > img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 8px; display: block; }
.ex-origin { position: absolute; left: 50%; top: 50%; width: 1px; height: 1px; }
.ex-sheet {
  position: absolute; left: 50%; top: 50%; width: 110px; margin: -70px 0 0 -55px; padding: 6px; border-radius: 10px; background: #fff; opacity: 0;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45); z-index: 2; pointer-events: none;
}
.ex-sheet img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: 6px; display: block; }
.ex-markets { display: flex; flex-direction: column; gap: 10px; width: min(220px, 80vw); }
@media (max-width: 767px) { .ex-markets { display: grid; grid-template-columns: 1fr 1fr; width: 100%; } }
.ex-market {
  position: relative; display: flex; align-items: center; height: 54px; padding: 0 18px; border-radius: 14px; overflow: hidden;
  background: var(--st-card); border: 1px solid var(--st-line-strong); font-size: 16px; font-weight: 800; color: var(--st-ink);
}
.ex-market .hl { background: color-mix(in srgb, var(--st-ai) 16%, transparent); box-shadow: inset 0 0 0 1px var(--st-ai); border-radius: 14px; }
.ex-market .chk { color: var(--st-ai); opacity: var(--on, 1); }

/* ⑦ 혜택 */
.st-land-plain { padding: 110px 0 60px; }
.st-land-card { position: relative; padding: 30px; border-radius: 22px; background: var(--st-panel); border: 1px solid var(--st-line-strong); }
.st-land-card.is-main { border-color: color-mix(in srgb, var(--st-ai) 55%, transparent); background: linear-gradient(160deg, color-mix(in srgb, var(--st-ai) 10%, var(--st-panel)), var(--st-panel) 60%); }
.st-land-badge { display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; font-size: 13px; font-weight: 900; background: var(--st-ai); color: var(--st-ai-text); }
.st-land-badge.is-soon { background: var(--st-card-hover); color: var(--st-ink-2); }

/* ⑧ 마지막 */
.st-land-final { position: relative; overflow: hidden; padding: 120px 0 40px; }

/* 움직임 줄이기 — 모두 멈추고 정지 화면(끝난 모습·히어로는 반반 비교) */
.st-land.is-static *, .st-land.is-static *::before, .st-land.is-static *::after { animation: none !important; transition: none !important; }
.st-land.is-static .st-land-ba .ba-top { clip-path: inset(0 50% 0 0); }
.st-land.is-static .st-land-ba .ba-line { transform: translateX(50%); opacity: 1; }
.st-land.is-static .ba-tag-after { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .st-land *, .st-land *::before, .st-land *::after { animation: none !important; transition: none !important; }
  .st-land .st-land-ba .ba-top { clip-path: inset(0 50% 0 0); }
  .st-land .st-land-ba .ba-line { transform: translateX(50%); opacity: 1; }
  .st-land .ba-tag-after { opacity: 1; }
}
</style>
