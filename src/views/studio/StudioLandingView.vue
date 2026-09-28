<template>
  <div ref="rootRef" class="st-land" :class="{ 'is-static': isStatic }" data-studio-landing>
    <!-- 상단 바 (구조 그대로: 로고 · 내 작업/로그인 · 무료로 시작하기) -->
    <header class="land-nav">
      <div class="land-wrap h-full flex items-center gap-3">
        <router-link :to="{ name: 'studio-landing' }" class="flex items-center gap-2.5 shrink-0">
          <span class="land-logo"><Sparkles class="w-4 h-4" :stroke-width="2.2" /></span>
          <span class="text-[17px] font-extrabold land-ink whitespace-nowrap">EUCHS Studio</span>
        </router-link>
        <div class="ml-auto flex items-center gap-1 sm:gap-2">
          <router-link v-if="currentUser" :to="{ name: 'studio-projects' }" class="land-btn land-btn-text">내 작업</router-link>
          <button v-else type="button" class="land-btn land-btn-text" @click="openLoginModal('login')">로그인</button>
          <button type="button" class="land-btn land-btn-primary land-btn-sm" data-land-start @click="start">무료로 시작하기</button>
        </div>
      </div>
    </header>

    <div class="land-dots">
      <!-- ① 첫 화면 -->
      <section class="land-hero" data-scene="hero">
        <div class="land-wrap text-center">
          <p class="land-kicker" data-hero-in>EUCHS 상세페이지 작업실 · <b class="land-orange-text">구매 고객 무료</b></p>
          <h1 class="land-h1" data-hero-in>만들고, 다듬고,<br />바로 올리세요.</h1>
          <p class="land-lead" data-hero-in>사진만 있으면 상세페이지 초안이 먼저 나와요. 나머지는 원하는 만큼만 고치면 돼요.</p>
          <div class="mt-8 flex flex-wrap justify-center gap-3" data-hero-in>
            <button type="button" class="land-btn land-btn-primary land-btn-lg" data-land-start @click="start">
              무료로 시작하기 <ArrowRight class="w-[18px] h-[18px]" :stroke-width="2.5" />
            </button>
            <button type="button" class="land-btn land-btn-ghost land-btn-lg" data-land-howto @click="scrollToSteps">사용법 보기</button>
          </div>
        </div>

        <!-- 편집기 화면 (그림은 studioLandingMedia 한 곳 — 지금은 직접 그린 임시 그림) -->
        <div class="land-wrap mt-12 md:mt-14">
          <div class="land-stage" data-hero-visual>
            <SceneVideo v-if="M.editor.video" :media="M.editor" alt="스튜디오 편집기 화면" :still="isStatic" />
            <div v-else class="land-win" data-scene-visual role="img" aria-label="스튜디오 편집기 화면 예시 — 사진 목록, 상세페이지, 섹션 미리보기">
              <div class="win-bar" aria-hidden="true">
                <span class="win-dots"><i /><i /><i /></span>
                <span class="win-title">매일 쓰는 머그</span>
                <span class="win-saved">· 자동 저장됨</span>
                <span class="flex-1" />
                <span class="win-ai">원클릭 AI 초안</span>
                <span class="win-export">내보내기</span>
              </div>
              <div class="win-body" aria-hidden="true">
                <ul class="win-rail">
                  <li v-for="(t, i) in RAIL" :key="i" :class="{ on: i === 1 }"><component :is="t" class="w-[18px] h-[18px]" :stroke-width="2" /></li>
                </ul>
                <div class="win-panel">
                  <p class="win-panel-title">사진 · 1688에서 가져옴</p>
                  <div class="win-thumbs">
                    <img v-for="(p, i) in M.oneClick.photos" :key="i" :src="p.after" alt="" width="800" height="800" decoding="async" />
                    <span />
                  </div>
                </div>
                <div class="win-canvas">
                  <div class="win-page">
                    <div class="pg-hero">
                      <img :src="M.erase.after" alt="" width="800" height="800" decoding="async" fetchpriority="high" />
                      <img :src="M.erase.before" alt="" width="800" height="800" decoding="async" class="pg-before" data-hero-erase-top />
                      <span class="pg-select" data-hero-select :style="boxStyle(M.erase.boxes[0])" />
                      <span class="pg-title" data-hero-title>매일 쓰는 머그</span>
                    </div>
                    <div class="pg-row">
                      <div class="pg-card pg-bg" :style="{ background: M.background.solidColor }">
                        <img :src="M.background.cutout" alt="" width="800" height="800" decoding="async" />
                        <img :src="M.background.original" alt="" width="800" height="800" decoding="async" class="pg-bg-orig" data-hero-bg-orig />
                      </div>
                      <div class="pg-card"><img :src="M.oneClick.photos[3].after" alt="" width="800" height="800" decoding="async" /></div>
                    </div>
                    <div class="pg-foot" />
                    <span class="win-tip t1" data-hero-tip>AI로 지우기 — 칠하면 자연스럽게</span>
                    <span class="win-tip t2" data-hero-tip>배경 바꾸기</span>
                    <span class="win-tip t3" data-hero-tip>섹션 끌어서 순서 바꾸기</span>
                  </div>
                </div>
                <ol class="win-mini">
                  <li class="on"><img :src="M.erase.after" alt="" width="800" height="800" decoding="async" /></li>
                  <li data-hero-mini="a"><img :src="M.background.cutout" alt="" width="800" height="800" decoding="async" :style="{ background: M.background.solidColor }" /></li>
                  <li data-hero-mini="b"><img :src="M.oneClick.photos[3].after" alt="" width="800" height="800" decoding="async" /></li>
                  <li /><li />
                </ol>
              </div>
            </div>

            <!-- 상태 카드 -->
            <div class="land-status s1" data-hero-card>
              <span class="st-ico is-src" aria-hidden="true">1688</span>
              <div><b>상품 불러옴</b><p>사진 14장</p></div>
            </div>
            <div class="land-status s2" data-hero-card>
              <span class="st-ico is-ok" aria-hidden="true"><Check class="w-4 h-4" :stroke-width="3" /></span>
              <div><b>내보내기 완료</b><p>내 상품에 보관됨</p></div>
            </div>
          </div>
        </div>
      </section>

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
        <ol class="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          <li v-for="(s, i) in STEPS" :key="s.title" class="step" data-reveal>
            <span class="step-no">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3 class="step-h">{{ s.title }}</h3>
            <p class="step-p">{{ s.desc }}</p>
            <div class="step-vis">
              <span v-for="c in s.chips" :key="c" class="chip">{{ c }}</span>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- ④ 이용 안내 -->
    <section id="plans" class="land-sec">
      <div class="land-wrap">
        <div data-reveal>
          <h2 class="land-h2">이용 안내</h2>
        </div>
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
// 개인 데이터를 보여 주지 않는 화면이라 로그아웃 구독은 필요 없다(버튼만 currentUser로 바뀜).
import { ref, h, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight, Check, Sparkles, MessageCircle,
  LayoutTemplate, Image as ImageIcon, Type, Shapes, Rows3, Wand2,
} from 'lucide-vue-next'
import { currentUser, openLoginModal } from '@/lib/auth'
import { LANDING_MEDIA as M } from '@/data/studioLandingMedia'
import { getStudioNotices } from '@/lib/studioNotices'
import { MARKETS } from '@/lib/studioMarketplaceRules'

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
const RAIL = [LayoutTemplate, ImageIcon, Type, Shapes, Rows3, Wand2] // 편집기 왼쪽 도구 막대 (템플릿·사진·텍스트·요소·섹션·배경합성)
const OC_STEPS = ['사진 고르기', '글자 지우기', '페이지 배치', '문구 초안']
// 판매처 칩 — 목록은 MARKETS(studioMarketplaceRules.js, 설정 > 판매처 연결과 같은 목록·순서). 쿠팡만 켜짐, soon = "준비 중" 작은 배지만
const STEPS = [
  { title: '가져오기', desc: '상품 링크, 찜한 상품, 주문한 상품, 내 사진 어디서든 시작해요.', chips: ['상품 링크', '주문한 상품', '내 사진'] },
  { title: '다듬기', desc: '필요 없는 글자와 배경을 AI로 정리하고, 원클릭으로 페이지 초안을 받아요.', chips: ['AI로 지우기', '배경 바꾸기', '원클릭 초안'] },
  { title: '올리기', desc: '섹션별 여러 장 또는 한 장으로 길게 받아 판매처에 올려요.', chips: ['JPG · PNG', '내 상품에 보관'] },
]
const FREE_FEATURES = ['AI 글자 지우기·덮기', '배경 지우기·단색·경계 다듬기', 'AI 배경 만들기 (하루 3회)', '원클릭 AI 자동 제작', '섹션별·한 장 내보내기']
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
  --l-dark: #1e2230; /* 편집기 모형 작업판 */
  --l-dark-2: #171a25;
  --l-dark-3: #262b3a;
  --l-wrap: 1240px;
  min-height: 100vh;
  overflow-x: clip;
  background: var(--l-bg);
  color: var(--l-ink);
}
.land-wrap { max-width: var(--l-wrap); margin-left: auto; margin-right: auto; padding: 0 16px; }
@media (min-width: 768px) { .land-wrap { padding: 0 40px; } }
.land-ink { color: var(--l-ink); }
.land-blue-text { color: var(--l-blue); }
.land-orange-text { color: var(--l-orange-ink); }
.land-orange-soft { color: #fdba74; }

/* 점 격자 바탕 (은은하게) */
.land-dots { background-image: radial-gradient(var(--l-dot) 1px, transparent 1px); background-size: 22px 22px; }

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
.land-btn-text { color: var(--l-ink); background: transparent; }
.land-btn-text:hover { background: rgba(11, 27, 63, 0.05); }
.land-btn-onnavy { color: #fff; border: 1px solid rgba(255, 255, 255, 0.35); background: transparent; }
.land-btn-onnavy:hover { background: rgba(255, 255, 255, 0.08); }
@media (max-width: 400px) { .land-nav .land-btn { height: 34px; padding: 0 10px; font-size: 13px; } }

/* 첫 화면 */
.land-hero { padding: 120px 0 0; }
@media (min-width: 768px) { .land-hero { padding-top: 132px; } }
.land-kicker { font-size: 14px; font-weight: 700; color: var(--l-ink-2); letter-spacing: 0.01em; }
.land-h1 {
  margin-top: 16px; font-size: clamp(38px, 5.6vw, 64px); font-weight: 900; line-height: 1.15; letter-spacing: -0.035em;
  color: var(--l-ink); word-break: keep-all;
}
.land-lead { margin: 18px auto 0; max-width: 620px; font-size: clamp(16px, 1.5vw, 19px); line-height: 1.65; color: var(--l-ink-2); word-break: keep-all; }

/* 편집기 화면 틀 */
.land-stage { position: relative; max-width: 1180px; margin: 0 auto; }
.land-win {
  position: relative; background: var(--l-white); border-radius: 18px 18px 0 0; overflow: hidden;
  box-shadow: 0 30px 80px rgba(11, 27, 63, 0.18), 0 0 0 1px var(--l-line);
}
.win-bar { display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 16px; border-bottom: 1px solid var(--l-line); font-size: 13px; color: var(--l-ink-2); }
.win-dots { display: flex; gap: 6px; }
.win-dots i { width: 11px; height: 11px; border-radius: 50%; background: #e6e9f0; }
.win-title { font-weight: 800; color: var(--l-ink); white-space: nowrap; }
.win-saved { white-space: nowrap; }
.win-ai { background: var(--l-blue); color: #fff; border-radius: 8px; padding: 6px 12px; font-weight: 700; white-space: nowrap; }
.win-export { border: 1px solid var(--l-line); border-radius: 8px; padding: 5px 12px; font-weight: 700; color: var(--l-ink); white-space: nowrap; }
.win-body { display: grid; grid-template-columns: 64px 240px 1fr 170px; height: 512px; background: var(--l-dark); }
.win-rail { background: var(--l-dark-2); display: flex; flex-direction: column; align-items: center; gap: 12px; padding-top: 16px; }
.win-rail li { width: 38px; height: 38px; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: #8d95aa; background: var(--l-dark-3); }
.win-rail li.on { background: var(--l-blue); color: #fff; }
.win-panel { background: #1b1f2c; padding: 16px; }
.win-panel-title { color: #fff; font-size: 13px; font-weight: 700; margin-bottom: 12px; }
.win-thumbs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.win-thumbs > * { aspect-ratio: 1 / 1; width: 100%; border-radius: 8px; object-fit: cover; background: #2a3044; display: block; }
.win-canvas { position: relative; display: flex; justify-content: center; padding-top: 24px; }
.win-page { position: relative; width: 330px; align-self: flex-start; background: #fff; border-radius: 4px; }
.pg-hero { position: relative; aspect-ratio: 1 / 1; overflow: hidden; border-radius: 4px 4px 0 0; }
.pg-hero > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pg-before { clip-path: inset(0 0 0 100%); }
.pg-select { position: absolute; border: 2px dashed var(--l-blue); border-radius: 6px; opacity: 0; }
.pg-title {
  position: absolute; left: 0; right: 0; bottom: 9%; text-align: center; font-size: 20px; font-weight: 900; color: var(--l-ink); letter-spacing: -0.02em;
}
.pg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px; }
.pg-card { position: relative; aspect-ratio: 4 / 3; border-radius: 6px; overflow: hidden; background: #f6f8fc; }
.pg-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pg-bg-orig { opacity: 0; }
.pg-foot { height: 80px; background: var(--l-navy); }
.win-mini { background: var(--l-dark-2); padding: 14px 12px; display: flex; flex-direction: column; gap: 8px; }
.win-mini li { height: 62px; border-radius: 6px; background: #2a3044; overflow: hidden; }
.win-mini li img { width: 100%; height: 100%; object-fit: cover; display: block; }
.win-mini li.on { outline: 2px solid var(--l-blue); outline-offset: 1px; }
.win-tip {
  position: absolute; z-index: 3; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
  background: #fff; border-radius: 12px; padding: 9px 14px; font-size: 13px; font-weight: 700; color: var(--l-ink);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.28);
}
.win-tip::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--l-blue); }
.win-tip.t1 { left: 26%; top: 24%; }
.win-tip.t2 { left: calc(100% - 30px); top: calc(330px + 34px); }
.win-tip.t3 { left: calc(100% + 24px); top: 40px; }

/* 상태 카드 */
.land-status {
  position: absolute; z-index: 4; display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px;
  background: #fff; box-shadow: 0 14px 34px rgba(11, 27, 63, 0.16), 0 0 0 1px var(--l-line); font-size: 13px;
}
.land-status b { display: block; font-weight: 800; color: var(--l-ink); }
.land-status p { color: var(--l-ink-2); font-size: 12px; margin-top: 1px; }
.land-status.s1 { left: -28px; top: 96px; }
.land-status.s2 { right: -28px; bottom: 72px; }
.st-ico { width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px; }
.st-ico.is-src { background: var(--l-blue-soft); color: var(--l-blue); }
.st-ico.is-ok { background: #e7f7ee; color: #12834a; }

/* 좁은 화면: 편집기 틀을 줄이고 상태 카드는 틀 아래로 */
@media (max-width: 1279px) {
  .land-status.s1 { left: 12px; }
  .land-status.s2 { right: 12px; }
}
@media (max-width: 1023px) {
  .win-body { grid-template-columns: 56px 190px 1fr; }
  .win-mini { display: none; }
  .win-tip.t3 { left: auto; right: -12px; top: calc(100% - 64px); }
}
@media (max-width: 767px) {
  .win-bar { gap: 8px; padding: 0 12px; }
  .win-saved, .win-export { display: none; }
  .win-body { grid-template-columns: 48px 1fr; height: 440px; }
  .win-rail li { width: 32px; height: 32px; }
  .win-panel { display: none; }
  .win-page { width: min(250px, 100% - 28px); }
  .win-tip { font-size: 12px; padding: 7px 11px; }
  .win-tip.t1 { left: 4%; top: 4%; }
  .win-tip.t2 { left: 30%; top: calc(100% - 150px); }
  .win-tip.t3 { right: 4%; top: calc(100% - 40px); }
  .land-stage { display: flex; flex-direction: column; }
  .land-status { position: static; box-shadow: 0 0 0 1px var(--l-line); margin-top: 10px; }
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
.step { border: 1px solid var(--l-line); border-radius: 20px; padding: 28px; background: #fff; }
.step-no { font-size: 14px; font-weight: 800; color: var(--l-blue); }
.step-h { margin-top: 8px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--l-ink); }
.step-p { margin-top: 8px; font-size: 15px; line-height: 1.6; color: var(--l-ink-2); word-break: keep-all; }
.step-vis { margin-top: 22px; min-height: 96px; border-radius: 14px; background: #f6f8fc; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; padding: 16px; }
.chip { background: #fff; border: 1px solid var(--l-line); border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 700; color: var(--l-ink); }

/* 이용 안내 */
.plan { position: relative; padding: 30px; border-radius: 20px; background: #fff; border: 1px solid var(--l-line); }
.plan.is-main { border-color: color-mix(in srgb, var(--l-orange) 45%, var(--l-line)); box-shadow: 0 14px 40px rgba(11, 27, 63, 0.06); }
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
