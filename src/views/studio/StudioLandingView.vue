<template>
  <div ref="rootRef" class="st-land" :class="{ 'is-static': isStatic }" data-studio-landing>
    <!-- 상단 바: 로고 · [무료로 시작하기] 하나 (로그인 여부와 상관없이 늘 보인다) -->
    <header class="land-nav">
      <div class="land-wrap h-full flex items-center gap-3">
        <router-link :to="{ name: 'studio-landing' }" class="flex items-center gap-2.5 shrink-0">
          <span class="land-logo"><Sparkles class="w-4 h-4" :stroke-width="2.2" /></span>
          <span class="text-[17px] font-extrabold land-ink whitespace-nowrap">EUCHS Studio</span>
          <span v-if="STUDIO_BETA" class="beta-badge" data-beta-badge>{{ BETA_BADGE }}</span>
        </router-link>
        <div class="ml-auto flex items-center gap-1 sm:gap-2">
          <button type="button" class="land-btn land-btn-primary land-btn-sm" data-land-start @click="start">무료로 시작하기</button>
        </div>
      </div>
    </header>

    <!-- ① 첫 화면 — 그림 배경(HERO_IMG). 640px 이상 = 그림을 전체 폭 배경 + 왼쪽 보라 그러데이션 위에 흰 글씨,
         640px 미만 = 위 글씨(보라 바탕) · 아래 세로 그림. 그림 아래 흰 물결은 그림에 들어 있다 → 다음 섹션 흰 바탕으로 이어짐.
         2026-09-29: 편집기 모형·상태 카드는 뺐다(해성 지시) — 모션의 hero 장면은 대상(장면 표시)이 없어 건너뛴다 -->
    <section class="land-hero">
      <div class="land-wrap hero-copy">
        <div class="hero-text">
          <p class="land-kicker" data-hero-in data-hero-eyebrow>
            <span v-if="STUDIO_BETA" class="beta-badge hero-beta">{{ BETA_BADGE }}</span>
            {{ eyebrow.lead }} · <b class="land-orange-soft">{{ eyebrow.free }}</b>
          </p>
          <h1 class="land-h1" data-hero-in>만들고, 다듬고,<br />바로 올리세요.</h1>
          <p class="land-lead" data-hero-in>사진만 있으면 상세페이지 초안이 먼저 나와요. 나머지는 원하는 만큼만 고치면 돼요.</p>
          <div class="hero-btns" data-hero-in>
            <button type="button" class="land-btn land-btn-white land-btn-lg" data-land-start @click="start">
              무료로 시작하기 <ArrowRight class="w-[18px] h-[18px]" :stroke-width="2.5" />
            </button>
            <button type="button" class="land-btn land-btn-line land-btn-lg" data-land-howto @click="scrollToSteps">사용법 보기</button>
          </div>
          <ul class="hero-mk" data-hero-in aria-label="판매처">
            <li v-for="m in MARKETS" :key="m.name" class="mk-chip" :class="{ 'is-soon': m.soon }">
              {{ m.name }}<span v-if="m.soon" class="hero-mk-soon">준비 중</span>
            </li>
          </ul>
        </div>
      </div>
      <!-- 그러데이션(글씨 바탕)은 그림 밖에 둔다 — 그림이 서서히 나타나는 동안에도 흰 글씨가 읽히고, 흰 물결은 흰 바탕 위에서 나타남 -->
      <div class="hero-shade" aria-hidden="true" />
      <!-- 첫 화면 그림이라 lazy 없음 + fetchpriority high (미리 불러오기 link는 script의 HERO_PRELOAD) -->
      <div class="hero-pic" data-hero-visual>
        <picture>
          <source :media="HERO_IMG.pcMedia" :srcset="HERO_IMG.pc" width="1920" height="1047" />
          <img :src="HERO_IMG.mobile" alt="" width="780" height="975" fetchpriority="high" decoding="async" />
        </picture>
      </div>
    </section>

    <div class="land-dots">
      <!-- ② 기능 타일 -->
      <section id="features" class="land-sec pt-16 md:pt-20" aria-labelledby="land-features-title">
        <div class="land-wrap">
          <h2 id="land-features-title" class="sr-only">기능</h2>
          <div class="land-bento">
            <!-- 글자 지우기 (큰 타일) -->
            <article class="tile tile-big" data-scene="erase">
              <h3 class="tile-h">필요 없는 글자, AI가 지워요</h3>
              <p class="tile-p">지운 자리는 주변과 어울리게 채워져요. 원본 사진은 그대로 보관돼요.</p>
              <SceneVideo v-if="M.erase.video" class="mt-5" :media="M.erase" :alt="M.erase.alt" :still="isStatic" />
              <div v-else class="cmp" data-scene-visual role="img" :aria-label="M.erase.alt">
                <div class="cmp-side">
                  <img :src="M.erase.before" alt="" width="800" height="800" loading="lazy" decoding="async" />
                  <span class="cmp-tag">원본</span>
                </div>
                <div class="cmp-side">
                  <img :src="M.erase.after" alt="" width="800" height="800" loading="lazy" decoding="async" />
                  <img :src="M.erase.before" alt="" width="800" height="800" loading="lazy" decoding="async" class="cmp-wipe" data-erase-top />
                  <span v-for="(b, i) in M.erase.boxes" :key="i" class="cmp-box" data-erase-box :style="boxStyle(b)" />
                  <span class="cmp-tag is-done" data-erase-done>완성</span>
                </div>
              </div>
            </article>

            <article class="tile">
              <h3 class="tile-h">1688에서 바로</h3>
              <p class="tile-p">상품 링크를 넣으면 사진과 상품 정보를 한 번에 가져와요. 직접 찍은 사진도 올릴 수 있어요.</p>
              <span class="tile-mark" aria-hidden="true">1688</span>
            </article>

            <article class="tile tile-orange">
              <h3 class="tile-h">구매 고객은 무료</h3>
              <p class="tile-p">이유씨컴퍼니에서 주문하고 결제까지 마친 적이 있다면 바로 쓸 수 있어요.</p>
            </article>

            <!-- 원클릭 -->
            <article class="tile tile-navy" data-scene="oneclick">
              <h3 class="tile-h">원클릭 AI 초안</h3>
              <p class="tile-p">사진 고르기부터 글자 지우기·배치·문구 초안까지 한 번에.</p>
              <div class="oc" data-scene-visual>
                <ol class="oc-steps">
                  <li v-for="s in OC_STEPS" :key="s" data-oc-step><Check class="w-3.5 h-3.5" :stroke-width="3" />{{ s }}</li>
                </ol>
                <div class="oc-bar" aria-hidden="true"><span data-oc-bar /></div>
              </div>
            </article>

            <!-- 판매처 보내기 -->
            <article class="tile" data-scene="export">
              <h3 class="tile-h">쿠팡으로 바로 보내기</h3>
              <p class="tile-p">상세페이지·상품명·검색태그·옵션·가격·대표이미지·고시정보·배송정보까지 한 번에 보내요.</p>
              <ul class="mk" data-scene-visual>
                <li v-for="m in MARKETS" :key="m.name" :class="{ 'is-soon': m.soon }" :data-ex-market="m.soon ? null : ''" :data-ex-soon="m.soon ? '' : null">
                  {{ m.name }}<span v-if="m.soon" class="mk-soon">준비 중</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>
    </div>

    <!-- ③ 만드는 순서 -->
    <section ref="stepsRef" id="steps" class="land-sec land-white">
      <div class="land-wrap">
        <div data-reveal>
          <h2 class="land-h2">세 단계면 끝나요</h2>
          <p class="land-p">디자인 프로그램을 몰라도 돼요.</p>
        </div>
        <!-- 카드 3장 + 단계마다 반복 시연 (StudioLandingSteps — 움직임 줄이기면 끝난 모습) -->
        <StudioLandingSteps :still="isStatic" />
      </div>
    </section>

    <!-- ④ 이용 안내 -->
    <section id="plans" class="land-sec">
      <div class="land-wrap">
        <div data-reveal>
          <h2 class="land-h2">이용 안내</h2>
        </div>
        <p v-if="STUDIO_BETA" class="land-p" data-reveal data-beta-note>{{ BETA_NOTE }}</p>
        <div class="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[960px]">
          <div class="plan is-main" data-reveal>
            <span class="plan-label is-free">무료</span>
            <h3 class="plan-h">이유씨컴퍼니 고객</h3>
            <p class="plan-p">이유씨컴퍼니에서 주문하고 결제까지 마친 고객은 스튜디오를 무료로 쓸 수 있어요.</p>
            <ul class="mt-5 space-y-2.5">
              <li v-for="f in FREE_FEATURES" :key="f" class="flex items-start gap-2 text-[15px] land-ink"><Check class="w-4 h-4 mt-1 land-blue-text shrink-0" :stroke-width="2.8" />{{ f }}</li>
            </ul>
          </div>
          <div class="plan" data-reveal>
            <span class="plan-label">준비 중</span>
            <h3 class="plan-h">일반 고객</h3>
            <p class="plan-p">준비 중이에요</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑤ 새 소식 -->
    <section id="news" class="land-sec land-white">
      <div class="land-wrap">
        <div data-reveal>
          <h2 class="land-h2">새 소식</h2>
        </div>
        <p v-if="noticeError" class="mt-6 text-[15px] font-bold text-red-600" data-land-news-error>{{ noticeError }}</p>
        <ul v-else class="news mt-8" data-reveal data-land-news>
          <li v-for="(n, i) in notices" :key="i" class="news-row">
            <span class="news-date">{{ n.date || '예정' }}</span>
            <span class="news-type">{{ NOTICE_TYPE_LABEL[n.type] || '공지' }}</span>
            <span class="news-title">{{ n.title }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ⑥ 마지막 안내 -->
    <section class="land-sec pb-10">
      <div class="land-wrap">
        <div class="land-band" data-reveal>
          <div>
            <h2 class="band-h">이유씨컴퍼니에서 구매하셨다면, 스튜디오는 <span class="land-orange-soft">무료</span>예요.</h2>
            <p class="band-p">사입부터 상세페이지 제작까지 한 곳에서. 찜한 상품, 주문한 상품, 내가 찍은 사진 어디서든 시작할 수 있어요.</p>
          </div>
          <div class="flex flex-wrap gap-3 shrink-0">
            <button type="button" class="land-btn land-btn-primary land-btn-lg" data-land-start @click="start">
              무료로 시작하기 <ArrowRight class="w-[18px] h-[18px]" :stroke-width="2.5" />
            </button>
            <a :href="KAKAO_CHAT" target="_blank" rel="noopener noreferrer" class="land-btn land-btn-onnavy land-btn-lg">
              <MessageCircle class="w-4 h-4" :stroke-width="2.4" /> 카카오톡으로 문의하기
            </a>
          </div>
        </div>
      </div>
      <footer class="land-wrap mt-16 pt-6 land-foot flex flex-wrap items-center gap-3 text-[13px]">
        <span>© 이유씨컴퍼니 (EUCHS)</span>
        <router-link to="/" class="land-foot-link ml-auto">이유씨컴퍼니 메인으로</router-link>
      </footer>
    </section>
  </div>
</template>

<script setup>
// 스튜디오 랜딩(/studio) — 로그인 없이 누구나 본다. 작업(최근 작업)은 /studio/projects(작업 홈)에서.
// 2026-09-28 재디자인: 밝은 바탕 + 이유씨 파랑(메인 헤더 [무역대행 신청] = Tailwind blue-600 #2563eb) · 남색 글자.
//   주황(메인 [1688 소싱몰] = orange-500 #f97316)은 "구매 고객 무료" 강조에만. 편집기 안(작업 화면)은 건드리지 않는다.
// 모션은 studioLandingMotion.js(GSAP)를 여기서만 동적 import — 편집기·ERP 번들에 섞이지 않는다.
// 기본 화면(CSS) = 장면이 끝난 모습 → 움직임 줄이기 설정·불러오기 실패여도 내용은 다 보인다.
// 개인 데이터를 보여 주지 않는 화면이라 로그아웃 구독은 필요 없다(로그인 여부에 따라 바뀌는 것도 없다).
import { ref, h, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Check, Sparkles, MessageCircle } from 'lucide-vue-next'
import { LANDING_MEDIA as M } from '@/data/studioLandingMedia'
import { getStudioNotices } from '@/lib/studioNotices'
import { MARKETS } from '@/lib/studioMarketplaceRules'
import { STUDIO_BETA, BETA_BADGE, BETA_NOTE, heroEyebrow } from '@/lib/studioBeta'
import StudioLandingSteps from './StudioLandingSteps.vue'

const eyebrow = heroEyebrow()
const router = useRouter()
const rootRef = ref(null)
const stepsRef = ref(null)
// 움직임 줄이기 = 첫 그리기부터 정지 화면 (영상도 처음부터 poster 사진 — 잠깐이라도 재생되지 않게)
const isStatic = ref(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

// 장면 영상 (studioLandingMedia의 video가 있을 때만 — 코드 그림 대신). 재생·멈춤은 studioLandingMotion이 장면 규칙대로
// still = 움직임 줄이기·모션을 못 불러옴 → poster 정지 사진
const SceneVideo = props => h('div', { class: 'land-video', 'data-scene-visual': '' }, [
  props.still
    ? h('img', { src: props.media.poster, alt: props.alt || '', loading: 'lazy', decoding: 'async' })
    : h('video', {
      src: props.media.video, poster: props.media.poster, autoplay: true, muted: true, loop: true, playsinline: true,
      preload: 'metadata', 'data-scene-video': '', 'aria-label': props.alt || undefined,
    }),
])
SceneVideo.props = ['media', 'alt', 'still']

const KAKAO_CHAT = 'http://pf.kakao.com/_xmQWsK/chat' // Footer·CommunitySection과 같은 상담 채널
// 첫 화면 그림 (public/studio-landing — 원본 hero_clean.png 1408×768은 저장소에 없음, sharp로 만든 webp 두 장)
//   pc = 가로 1920·품질 82 / mobile = 오른쪽 사람·화면 부분(원본 x800~1360·y68~768)을 세로로 잘라 가로 780·품질 82
//   640px 기준은 CSS(.land-hero 레이아웃 @media)와 같다
const HERO_IMG = {
  pc: '/studio-landing/hero-pc.webp',
  mobile: '/studio-landing/hero-mobile.webp',
  pcMedia: '(min-width: 640px)',
  mobileMedia: '(max-width: 639.98px)',
}
// 미리 불러오기 — 화면 너비에 맞는 한 장만 받는다(media). 랜딩이 떠 있는 동안만 head에 둔다
const HERO_PRELOAD = [[HERO_IMG.pc, HERO_IMG.pcMedia], [HERO_IMG.mobile, HERO_IMG.mobileMedia]].map(([href, media]) => {
  const link = document.createElement('link')
  Object.assign(link, { rel: 'preload', as: 'image', href, media })
  link.setAttribute('fetchpriority', 'high')
  link.setAttribute('data-studio-hero-preload', '')
  document.head.appendChild(link)
  return link
})
const OC_STEPS = ['사진 고르기', '글자 지우기', '페이지 배치', '문구 초안']
// 판매처 칩 — 목록은 MARKETS(studioMarketplaceRules.js, 설정 > 판매처 연결과 같은 목록·순서). 쿠팡만 켜짐, soon = "준비 중" 작은 배지만
const FREE_FEATURES = ['AI 글자 지우기·덮기', '배경 지우기·단색·경계 다듬기', 'AI 배경 만들기 (하루 3회)', '원클릭 AI 자동 제작', '섹션별·한 장 다운로드']
const NOTICE_TYPE_LABEL = { update: '업데이트', notice: '공지', soon: '예정' }

/** 글자 자리(% — studioLandingPlaceholders TEXT_BOXES) → 위치 */
const boxStyle = b => ({ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` })

// [무료로 시작하기] = 작업 홈으로. 로그인 전이면 기존 라우터 가드가 복귀 주소를 기억하고 로그인 창을 연다(구글·카카오 로그인도 같은 규칙).
// 로그인했지만 자격이 없으면 가드가 안내 창(1688 구매하러 가기)을 띄운다
function start() {
  router.push({ name: 'studio-projects' })
}

function scrollToSteps() {
  stepsRef.value?.scrollIntoView({ behavior: isStatic.value ? 'auto' : 'smooth', block: 'start' })
}

const notices = ref([])
const noticeError = ref('')
async function loadNotices() {
  try {
    notices.value = await getStudioNotices()
  } catch (e) {
    console.error('[StudioLanding] 새 소식을 불러오지 못했어요:', e)
    noticeError.value = `새 소식을 불러오지 못했어요: ${e.message || e}`
  }
}

let stopMotion = null
let alive = true
onMounted(async () => {
  loadNotices()
  if (isStatic.value) return // 움직임 줄이기면 모션을 불러오지 않음
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
  HERO_PRELOAD.forEach(link => link.remove())
  stopMotion?.()
  stopMotion = null
})
</script>

<style scoped>
/* 랜딩 전용 밝은 색 — 편집기 토큰(--st-*)과 따로. 파랑 = 메인 [무역대행 신청](blue-600), 주황 = 메인 [1688 소싱몰](orange-500) */
.st-land {
  --l-bg: #f7f8fb;
  --l-white: #ffffff;
  --l-line: #e6e9f0;
  --l-dot: #d5dae5;
  --l-ink: #0b1b3f;
  --l-ink-2: #5b6475;
  --l-blue: #2563eb;
  --l-blue-d: #1d4ed8;
  --l-blue-soft: #eff4ff;
  --l-orange: #f97316;
  --l-orange-ink: #c2410c; /* 흰 바탕 위 주황 글자 (대비 AA) */
  --l-navy: #0b1b3f;
  --l-navy-ink: #afc0e6;
  --l-wrap: 1240px;
  /* 첫 화면 보라 — "세 단계" 카드 띠·시연 화면(StudioLandingSteps)도 같은 색 */
  --hero-top: #2a1a6e;  /* 진한 보라 */
  --hero-mid: #4a3fa6;
  --hero-meet: #7587d5; /* 모바일 그림 맨 윗줄 평균색 — 글씨 바탕 끝이 그림과 이어지게 */
  min-height: 100vh;
  overflow-x: clip;
  background: var(--l-bg);
  color: var(--l-ink);
}
.land-wrap { max-width: var(--l-wrap); margin-left: auto; margin-right: auto; padding: 0 16px; }
@media (min-width: 768px) { .land-wrap { padding: 0 40px; } }
.land-ink { color: var(--l-ink); }
.land-blue-text { color: var(--l-blue); }
.land-orange-soft { color: #fdba74; }

/* 점 격자 바탕 (은은하게) — 맨 위 180px는 흰색에서 서서히: 첫 화면 그림의 흰 물결과 이어지게 */
.land-dots {
  background-image: linear-gradient(180deg, var(--l-white), rgba(255, 255, 255, 0)), radial-gradient(var(--l-dot) 1px, transparent 1px);
  background-size: 100% 180px, 22px 22px;
  background-repeat: no-repeat, repeat;
}

/* 상단 바 */
.land-nav {
  position: fixed; inset: 0 0 auto 0; z-index: 40; height: 64px;
  background: color-mix(in srgb, var(--l-bg) 92%, transparent);
  border-bottom: 1px solid var(--l-line);
}
.land-logo {
  width: 30px; height: 30px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--l-blue); color: #fff;
}

/* 버튼 */
.land-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 16px;
  border-radius: 10px; font-size: 14px; font-weight: 700; white-space: nowrap; cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, transform 0.15s;
}
.land-btn:active { transform: scale(0.98); }
.land-btn:focus-visible { outline: 2px solid var(--l-blue); outline-offset: 2px; }
.land-btn-lg { height: 52px; padding: 0 24px; border-radius: 12px; font-size: 16px; }
.land-btn-sm { height: 38px; padding: 0 14px; }
.land-btn-primary { background: var(--l-blue); color: #fff; box-shadow: 0 6px 18px rgba(37, 99, 235, 0.25); }
.land-btn-primary:hover { background: var(--l-blue-d); }
.land-btn-ghost { background: var(--l-white); color: var(--l-ink); border: 1px solid var(--l-line); }
.land-btn-ghost:hover { border-color: #cfd5e1; background: #fbfcfe; }
.land-btn-onnavy { color: #fff; border: 1px solid rgba(255, 255, 255, 0.35); background: transparent; }
.land-btn-onnavy:hover { background: rgba(255, 255, 255, 0.08); }
@media (max-width: 400px) { .land-nav .land-btn { height: 34px; padding: 0 10px; font-size: 13px; } }

/* 첫 화면 — 그림 배경. 기본(640px 미만) = 위 글씨(보라 그러데이션 바탕) · 아래 세로 그림(HERO_IMG.mobile) */
.land-hero {
  position: relative; margin-top: 64px; /* 고정 상단 바 높이 */
  color: #fff; background: var(--l-white);
}
/* 모바일: 보라 바탕은 글씨 칸에만 (그림 칸은 흰 바탕 — 그림 아래 흰 물결이 나타나는 동안 색이 바뀌지 않게) */
.hero-copy {
  position: relative; z-index: 2; padding-top: 40px; padding-bottom: 28px;
  background: linear-gradient(180deg, var(--hero-top) 0%, var(--hero-mid) 62%, var(--hero-meet) 100%);
}
.hero-text { max-width: 560px; }
.land-kicker { font-size: 14px; font-weight: 700; line-height: 1.6; color: rgba(255, 255, 255, 0.88); letter-spacing: 0.01em; word-break: keep-all; }
.hero-beta { display: inline-block; margin-right: 6px; vertical-align: 1px; color: #fff; background: rgba(255, 255, 255, 0.2); }
.land-h1 {
  margin-top: 14px; font-size: clamp(36px, 5.6vw, 64px); font-weight: 900; line-height: 1.15; letter-spacing: -0.035em;
  color: #fff; word-break: keep-all; text-shadow: 0 2px 16px rgba(20, 10, 60, 0.3);
}
.land-lead { margin-top: 16px; max-width: 520px; font-size: clamp(16px, 1.5vw, 19px); line-height: 1.65; color: rgba(255, 255, 255, 0.92); word-break: keep-all; }
.hero-btns { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 10px 12px; }
.land-btn-white { background: #fff; color: var(--hero-top); box-shadow: 0 8px 22px rgba(20, 10, 60, 0.25); }
.land-btn-white:hover { background: #f1eefe; }
.land-btn-line { background: transparent; color: #fff; border: 1.5px solid rgba(255, 255, 255, 0.9); }
.land-btn-line:hover { background: rgba(255, 255, 255, 0.12); }
.land-hero .land-btn:focus-visible { outline-color: #fff; }
/* 판매처 칩 — 목록은 MARKETS 하나(아래 판매처 타일과 같음). 칩 모양(.mk-chip)은 보라 바탕용 한 규칙을
   첫 화면과 "올리기" 시연(StudioLandingSteps)이 같이 쓴다 */
.hero-mk { margin-top: 22px; display: flex; flex-wrap: wrap; gap: 6px; }
.st-land :deep(.mk-chip) {
  display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 7px; font-size: 12.5px; font-weight: 700;
  white-space: nowrap; color: #fff; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.4);
}
.hero-mk li.is-soon { color: rgba(255, 255, 255, 0.8); background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.22); }
.hero-mk-soon { padding: 0 5px; border-radius: 4px; font-size: 10.5px; background: rgba(255, 255, 255, 0.16); }
.hero-pic { position: relative; }
.hero-pic img { display: block; width: 100%; height: auto; }
.hero-shade { display: none; }
@media (max-width: 639.98px) {
  .hero-btns .land-btn { flex: 1 1 auto; }
  /* 그림 윗변을 글씨 바탕 끝 색에서 서서히 이어 줌 */
  .hero-pic::before {
    content: ''; position: absolute; z-index: 1; inset: 0 0 auto 0; height: 56px;
    background: linear-gradient(180deg, var(--hero-meet), rgba(117, 135, 213, 0));
  }
}

/* 640px 이상: 그림 = 전체 폭 배경(사람은 오른쪽, 아래 흰 물결은 바닥에 붙임), 글씨 = 왼쪽 */
@media (min-width: 640px) {
  .land-hero {
    display: flex; align-items: center;
    min-height: clamp(600px, calc(100vw / 1.834), 860px); /* 1.834 = 그림 가로/세로 (1920×1047) */
  }
  .hero-copy { width: 100%; padding-top: 48px; padding-bottom: max(120px, 13vw); /* 물결 위로 */ background: none; }
  .hero-text { max-width: min(560px, 62%); }
  .hero-pic { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
  .hero-pic picture, .hero-pic img { position: absolute; inset: 0; width: 100%; height: 100%; }
  .hero-pic img { object-fit: cover; object-position: 80% 100%; }
  /* 왼쪽 진한 보라 → 투명. 아래쪽은 흐려서 흰 물결을 덮지 않음 */
  .hero-shade {
    display: block; position: absolute; inset: 0; z-index: 1;
    background: linear-gradient(90deg, rgba(34, 18, 98, 0.88) 0%, rgba(40, 22, 110, 0.7) 32%, rgba(48, 30, 120, 0.28) 55%, rgba(48, 30, 120, 0) 72%);
    -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent 74%);
    mask-image: linear-gradient(180deg, #000 55%, transparent 74%);
  }
}
/* 태블릿(640~1023px): 글씨 칸이 그림 속 화면·아이콘 위까지 오므로 그러데이션을 더 진하고 넓게 (얼굴은 오른쪽 끝이라 그대로 보임) */
@media (min-width: 640px) and (max-width: 1023.98px) {
  .hero-shade {
    background: linear-gradient(90deg, rgba(34, 18, 98, 0.92) 0%, rgba(40, 22, 110, 0.82) 40%, rgba(48, 30, 120, 0.45) 62%, rgba(48, 30, 120, 0) 78%);
  }
}

/* 기능 타일 */
.land-sec { padding: 72px 0; }
@media (min-width: 768px) { .land-sec { padding: 96px 0; } }
.land-white { background: var(--l-white); }
.land-bento { display: grid; grid-template-columns: 1fr; gap: 16px; padding-bottom: 24px; }
@media (min-width: 768px) {
  .land-bento { grid-template-columns: 1fr 1fr; }
  .tile-big { grid-column: span 2; }
}
@media (min-width: 1024px) {
  .land-bento { grid-template-columns: 2fr 1fr 1fr; grid-auto-rows: 240px; gap: 18px; }
  .tile-big { grid-column: auto; grid-row: span 2; }
}
.tile { position: relative; overflow: hidden; background: #fff; border: 1px solid var(--l-line); border-radius: 20px; padding: 26px; display: flex; flex-direction: column; min-height: 200px; }
.tile-h { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; color: inherit; word-break: keep-all; }
.tile-p { margin-top: 8px; font-size: 14.5px; line-height: 1.6; color: var(--l-ink-2); word-break: keep-all; }
.tile-orange { background: var(--l-orange); border-color: var(--l-orange); color: #fff; }
.tile-orange .tile-p { color: #fff3e8; }
.tile-navy { background: var(--l-navy); border-color: var(--l-navy); color: #fff; }
.tile-navy .tile-p { color: var(--l-navy-ink); }
.tile-mark { position: absolute; right: 22px; bottom: 14px; font-size: 56px; font-weight: 900; color: var(--l-ink); opacity: 0.12; letter-spacing: -0.02em; }

.cmp { margin-top: 22px; flex: 1; min-height: 240px; display: grid; grid-template-columns: 1fr 1fr; border-radius: 14px; overflow: hidden; border: 1px solid var(--l-line); }
.cmp-side { position: relative; overflow: hidden; }
.cmp-side + .cmp-side { border-left: 1px solid var(--l-line); }
.cmp-side > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cmp-wipe { clip-path: inset(0 0 0 100%); }
.cmp-box { position: absolute; z-index: 2; border: 2px solid var(--l-blue); border-radius: 6px; background: rgba(37, 99, 235, 0.12); opacity: 0; }
.cmp-tag {
  position: absolute; z-index: 3; top: 12px; left: 12px; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 800;
  background: #fff; color: var(--l-ink); border: 1px solid var(--l-line);
}
.cmp-tag.is-done { color: var(--l-blue); }
.land-video { margin-top: 22px; border-radius: 14px; overflow: hidden; }
.land-video > video, .land-video > img { display: block; width: 100%; height: auto; }

.oc { margin-top: auto; padding-top: 16px; }
.oc-steps { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
.oc-steps li {
  --on: 1; display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700;
  color: color-mix(in srgb, #fff calc(45% + var(--on) * 55%), transparent);
}
.oc-steps li svg { color: #60a5fa; opacity: var(--on); }
.oc-bar { margin-top: 12px; height: 6px; border-radius: 6px; background: rgba(255, 255, 255, 0.14); overflow: hidden; }
.oc-bar span { display: block; height: 100%; background: #60a5fa; transform-origin: left center; }

.mk { margin-top: auto; padding-top: 14px; display: flex; flex-wrap: wrap; gap: 6px; }
.mk li {
  --on: 1; padding: 5px 10px; border-radius: 8px; font-size: 13px; font-weight: 700; border: 1px solid var(--l-line);
  color: color-mix(in srgb, var(--l-ink) calc(40% + var(--on) * 60%), transparent);
  background: color-mix(in srgb, var(--l-blue-soft) calc(var(--on) * 100%), #fff);
}
.mk li.is-soon { --on: 0; display: inline-flex; align-items: center; gap: 6px; }
.mk-soon { padding: 1px 6px; border-radius: 5px; font-size: 11px; font-weight: 700; color: var(--l-ink-2); background: var(--l-line); }

/* 만드는 순서 */
.land-h2 { font-size: clamp(28px, 3.4vw, 40px); font-weight: 900; letter-spacing: -0.03em; line-height: 1.2; color: var(--l-ink); word-break: keep-all; }
.land-p { margin-top: 12px; font-size: 17px; color: var(--l-ink-2); word-break: keep-all; }

/* 이용 안내 */
.plan { position: relative; padding: 30px; border-radius: 20px; background: #fff; border: 1px solid var(--l-line); }
.plan.is-main { border-color: color-mix(in srgb, var(--l-orange) 45%, var(--l-line)); box-shadow: 0 14px 40px rgba(11, 27, 63, 0.06); }
.beta-badge { padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: 0.08em; color: var(--l-blue); background: var(--l-blue-soft); }
.plan-label { font-size: 14px; font-weight: 900; color: var(--l-ink-2); }
.plan-label.is-free { color: var(--l-orange-ink); }
.plan-h { margin-top: 6px; font-size: 22px; font-weight: 800; color: var(--l-ink); }
.plan-p { margin-top: 8px; font-size: 15px; line-height: 1.65; color: var(--l-ink-2); word-break: keep-all; }

/* 새 소식 */
.news { border-top: 1px solid var(--l-line); max-width: 960px; }
.news-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 16px; padding: 16px 2px; border-bottom: 1px solid var(--l-line); }
.news-date { font-size: 14px; color: var(--l-ink-2); font-variant-numeric: tabular-nums; min-width: 92px; }
.news-type { font-size: 13px; font-weight: 800; color: var(--l-blue); min-width: 56px; }
.news-title { font-size: 15px; font-weight: 700; color: var(--l-ink); word-break: keep-all; flex: 1 1 260px; }

/* 마지막 안내 */
.land-band {
  display: flex; flex-direction: column; gap: 24px; align-items: flex-start; justify-content: space-between;
  border-radius: 24px; background: var(--l-navy); color: #fff; padding: 36px 24px;
}
@media (min-width: 1024px) { .land-band { flex-direction: row; align-items: center; padding: 48px 56px; } }
.band-h { font-size: clamp(22px, 2.4vw, 30px); font-weight: 800; letter-spacing: -0.02em; line-height: 1.3; word-break: keep-all; }
.band-p { margin-top: 10px; color: var(--l-navy-ink); font-size: 15px; line-height: 1.6; word-break: keep-all; }
.land-foot { border-top: 1px solid var(--l-line); color: var(--l-ink-2); }
.land-foot-link:hover { color: var(--l-ink); text-decoration: underline; }

/* 움직임 줄이기 — 모두 멈춘 끝난 모습 (기본 CSS가 끝난 모습이라 애니메이션·전환만 끈다) */
.st-land.is-static *, .st-land.is-static *::before, .st-land.is-static *::after { animation: none !important; transition: none !important; }
@media (prefers-reduced-motion: reduce) {
  .st-land *, .st-land *::before, .st-land *::after { animation: none !important; transition: none !important; }
}
</style>
