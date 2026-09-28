<template>
  <!-- PC: 헤더 알약 버튼 + 메가메뉴 카드 -->
  <div
    v-if="variant === 'desktop'"
    ref="rootRef"
    class="hsn-root relative"
    @mouseenter="openSoon"
    @mouseleave="closeSoon"
    @focusin="openNow"
    @focusout="onFocusOut"
    @keydown.esc.stop="closeByEsc"
  >
    <router-link
      ref="triggerRef"
      to="/studio"
      class="hsn-pill group"
      :aria-expanded="open ? 'true' : 'false'"
      aria-controls="hsn-mega"
      aria-label="AI 스튜디오 (무료) — 스튜디오로 이동"
      data-header-studio
    >
      <span class="hsn-ring" aria-hidden="true"><span class="hsn-ring-spin"></span></span>
      <span class="hsn-pill-inner">
        <span class="hsn-pill-shine" aria-hidden="true"></span>
        <svg class="hsn-spark" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
          <path d="M12 2.5c.5 4.6 2.4 7 7.5 9.5-5.1 2.5-7 4.9-7.5 9.5-.5-4.6-2.4-7-7.5-9.5 5.1-2.5 7-4.9 7.5-9.5z" fill="url(#hsn-spark-g)" />
          <path d="M19.5 2.8c.2 1.5.8 2.2 2.3 3-1.5.8-2.1 1.5-2.3 3-.2-1.5-.8-2.2-2.3-3 1.5-.8 2.1-1.5 2.3-3z" fill="#fdba74" />
          <defs>
            <linearGradient id="hsn-spark-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#fed7aa" />
              <stop offset="1" stop-color="#93c5fd" />
            </linearGradient>
          </defs>
        </svg>
        <span class="relative">AI 스튜디오</span>
      </span>
      <span class="hsn-badge" aria-hidden="true">무료</span>
    </router-link>

    <!-- 메가메뉴 — 위쪽 여백(pt)이 버튼과 카드 사이를 이어 마우스가 지나가도 닫히지 않는다 -->
    <div
      v-show="open"
      id="hsn-mega"
      class="absolute left-1/2 top-full -translate-x-1/2 pt-2.5 z-[100]"
      data-header-studio-mega
      @mouseenter="openSoon"
    >
      <div class="hsn-card w-[560px] rounded-2xl p-5 text-left">
        <p class="text-[11px] font-bold tracking-wide text-orange-300">EUCHS AI 스튜디오</p>
        <p class="mt-1 text-[17px] font-black text-white leading-snug">사진만 넣으면, 한국 상세페이지까지</p>

        <ul class="mt-4 grid grid-cols-3 gap-3">
          <li v-for="f in FEATURES" :key="f.key" class="hsn-feature rounded-xl p-2.5">
            <div class="hsn-thumb relative h-[92px] rounded-lg overflow-hidden" aria-hidden="true">
              <template v-if="f.key === 'oneclick'">
                <div class="absolute inset-0 hsn-oneclick-bg"></div>
                <div class="hsn-page absolute left-1/2 top-2 -translate-x-1/2 w-[62px] rounded-md bg-white p-1 space-y-1">
                  <div class="h-1.5 w-8 rounded-full bg-slate-800/80"></div>
                  <img v-for="(src, i) in ONECLICK_PHOTOS" :key="i" :src="src" alt="" class="block w-full h-[22px] object-cover rounded-sm" />
                </div>
                <svg class="absolute right-2 top-2" viewBox="0 0 24 24" width="14" height="14"><path d="M12 2.5c.5 4.6 2.4 7 7.5 9.5-5.1 2.5-7 4.9-7.5 9.5-.5-4.6-2.4-7-7.5-9.5 5.1-2.5 7-4.9 7.5-9.5z" fill="#fdba74" /></svg>
              </template>
              <template v-else>
                <img :src="f.before" alt="" class="absolute inset-0 w-full h-full object-cover" :style="{ objectPosition: f.pos }" />
                <div class="absolute inset-0 hsn-after">
                  <div v-if="f.afterBg" class="absolute inset-0"><img :src="f.afterBg" alt="" class="w-full h-full object-cover" :style="{ objectPosition: f.pos }" /></div>
                  <img :src="f.after" alt="" class="absolute inset-0 w-full h-full object-cover" :style="{ objectPosition: f.pos }" />
                </div>
                <span class="absolute inset-y-0 left-1/2 w-px bg-white/90"></span>
                <span class="hsn-tag left-1">원본</span>
                <span class="hsn-tag right-1">완성</span>
              </template>
            </div>
            <p class="mt-2 text-[13px] font-bold text-white">{{ f.title }}</p>
            <p class="mt-0.5 text-[11.5px] leading-snug text-slate-300 break-keep">{{ f.desc }}</p>
          </li>
        </ul>

        <div class="mt-4 flex items-center gap-3">
          <router-link to="/studio" class="hsn-cta" data-header-studio-cta @click="open = false">
            무료로 시작하기 <span aria-hidden="true">→</span>
          </router-link>
          <p class="text-[11.5px] text-slate-300">EUCHS에서 주문하신 고객은 무료</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 모바일: 메뉴 맨 위 어두운 카드 -->
  <div v-else class="hsn-mobile rounded-2xl p-4 mb-2" data-header-studio-mobile>
    <div class="flex items-center gap-2">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M12 2.5c.5 4.6 2.4 7 7.5 9.5-5.1 2.5-7 4.9-7.5 9.5-.5-4.6-2.4-7-7.5-9.5 5.1-2.5 7-4.9 7.5-9.5z" fill="#fdba74" />
      </svg>
      <span class="text-[15px] font-black text-white">AI 스튜디오</span>
      <span class="hsn-badge-inline">무료</span>
    </div>
    <p class="mt-1.5 text-[13px] text-slate-300 break-keep">사진만 넣으면, 한국 상세페이지까지. 글자 지우기·배경 바꾸기·원클릭 상세페이지.</p>
    <router-link
      to="/studio"
      class="hsn-cta mt-3 w-full justify-center"
      aria-label="AI 스튜디오 무료로 시작하기"
      @click="emit('navigate')"
    >
      무료로 시작하기 <span aria-hidden="true">→</span>
    </router-link>
  </div>
</template>

<script setup>
// 메인 헤더 "AI 스튜디오" 항목 (PC 알약 + 메가메뉴 / 모바일 카드). 노출 조건(showStudioMenu)은 Header.vue가 정한다.
// 그림은 스튜디오 랜딩 임시 그림(직접 그린 SVG — studioLandingPlaceholders.js)을 그대로 쓴다. 새 라이브러리 없음.
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { productShot, clutteredShot, cutoutShot, marbleShot } from '@/data/studioLandingPlaceholders.js'

defineProps({ variant: { type: String, default: 'desktop' } })
const emit = defineEmits(['navigate'])

const PINK = ['#fbe3e6', '#f3c6cd']
const MINT = ['#e3f3ef', '#c7e6de']
const CREAM = ['#f6eee2', '#e9dcc8']

const FEATURES = [
  // pos = 넓은 칸에서 보일 자리 (원본의 위쪽 제목 글자가 보이게 30%)
  { key: 'erase', title: 'AI 글자 지우기', desc: '사진 속 글자를 AI가 깨끗하게 지워요', before: productShot('band', PINK, true), after: productShot('band', PINK, false), pos: '50% 30%' },
  { key: 'bg', title: '배경 바꾸기', desc: '배경을 빼고 단색·AI 장면으로 바꿔요', before: clutteredShot(), after: cutoutShot(), afterBg: marbleShot(), pos: '50% 50%' },
  { key: 'oneclick', title: '원클릭 상세페이지', desc: '사진을 넣으면 페이지가 한 번에 만들어져요' },
]
const ONECLICK_PHOTOS = [productShot('mug', CREAM, false), productShot('bottle', MINT, false)]

const route = useRoute()
const open = ref(false)
const rootRef = ref(null)
const triggerRef = ref(null)
const CLOSE_DELAY_MS = 180
let closeTimer = null

function cancelClose() {
  clearTimeout(closeTimer)
  closeTimer = null
}
function openSoon() {
  cancelClose()
  open.value = true
}
let skipFocusOpen = false // Esc로 닫고 알약에 포커스를 돌려줄 때는 다시 열지 않는다
function openNow() {
  if (skipFocusOpen) {
    skipFocusOpen = false
    return
  }
  cancelClose()
  open.value = true
}
function closeSoon() {
  cancelClose()
  closeTimer = setTimeout(() => { open.value = false }, CLOSE_DELAY_MS)
}
function onFocusOut(e) {
  if (!rootRef.value?.contains(e.relatedTarget)) {
    cancelClose()
    open.value = false
  }
}
function closeByEsc() {
  if (!open.value) return
  cancelClose()
  open.value = false
  const el = triggerRef.value?.$el
  if (el && document.activeElement !== el) {
    skipFocusOpen = true
    el.focus()
  }
}
function onDocPointerDown(e) {
  if (open.value && rootRef.value && !rootRef.value.contains(e.target)) {
    cancelClose()
    open.value = false
  }
}

watch(() => route.fullPath, () => {
  cancelClose()
  open.value = false
})

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onUnmounted(() => {
  cancelClose()
  document.removeEventListener('pointerdown', onDocPointerDown)
})
</script>

<style scoped>
/* 알약 — 옆 두 버튼(px-3 py-1.5 text-xs = 높이 28px)과 같은 높이 */
.hsn-pill {
  position: relative;
  display: inline-flex;
  border-radius: 9999px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  color: #fff;
  outline: none;
  transition: transform 0.15s ease;
}
.hsn-pill:active { transform: scale(0.95); }
.hsn-pill:focus-visible { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #2563eb; }

/* 도는 빛 테두리 — 1.5px 틈으로 보이는 큰 conic 사각형을 transform으로만 돌린다 */
.hsn-ring {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  overflow: hidden;
}
.hsn-ring-spin {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 240px;
  height: 240px;
  margin: -120px 0 0 -120px;
  background: conic-gradient(from 0deg, #f97316, #f59e0b 18%, #2563eb 42%, #60a5fa 55%, #2563eb 68%, #f97316 100%);
  animation: hsn-spin 5s linear infinite;
  will-change: transform;
}
@keyframes hsn-spin { to { transform: rotate(360deg); } }

.hsn-pill-inner {
  position: relative;
  margin: 1.5px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4.5px 11px;          /* 1.5px 테두리 + 4.5px = 옆 버튼 py-1.5(6px) */
  border-radius: 9999px;
  background: #0b1220;
  white-space: nowrap;
  overflow: hidden;
}
.hsn-pill-shine {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.12);
  opacity: 0;
  transition: opacity 0.2s ease;
}
.hsn-pill:hover .hsn-pill-shine,
.hsn-pill:focus-visible .hsn-pill-shine { opacity: 1; }

.hsn-spark { position: relative; flex-shrink: 0; }
.hsn-pill:hover .hsn-spark { animation: hsn-glint 0.7s ease-out 1; }
@keyframes hsn-glint {
  0% { transform: scale(1) rotate(0deg); opacity: 1; }
  45% { transform: scale(1.45) rotate(35deg); opacity: 0.75; }
  100% { transform: scale(1) rotate(90deg); opacity: 1; }
}

/* 무료 배지 — 흰 글씨 대비 AA를 위해 짙은 주황(#c2410c, 대비 5.2:1) */
.hsn-badge {
  position: absolute;
  top: -7px;
  right: -6px;
  padding: 1px 4px;
  border-radius: 9999px;
  background: #c2410c;
  color: #fff;
  font-size: 9px;
  line-height: 11px;
  font-weight: 800;
  box-shadow: 0 0 0 1.5px #fff;
  pointer-events: none;
}
.hsn-badge-inline {
  padding: 1px 6px;
  border-radius: 9999px;
  background: #c2410c;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

/* 메가메뉴 카드 — 스튜디오 랜딩과 같은 어두운 톤 */
.hsn-card {
  background: #0c0d10;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 28px 60px -18px rgba(2, 6, 23, 0.7);
}
.hsn-feature {
  background: #17191e;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.hsn-after { clip-path: inset(0 0 0 50%); }
.hsn-tag {
  position: absolute;
  bottom: 4px;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(12, 13, 16, 0.78);
  color: #fff;
  font-size: 9.5px;
  line-height: 15px;
  font-weight: 700;
}
.hsn-oneclick-bg { background: linear-gradient(135deg, #1e293b, #0f172a); }
.hsn-page { box-shadow: 0 8px 18px -6px rgba(0, 0, 0, 0.6); }

.hsn-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 9999px;
  background: #fff;
  color: #0b1220;
  font-size: 13px;
  font-weight: 800;
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.hsn-cta:hover { opacity: 0.9; }
.hsn-cta:active { transform: scale(0.97); }
.hsn-cta:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }

.hsn-mobile {
  background: #0c0d10;
  border: 1px solid transparent;
  background-image: linear-gradient(#0c0d10, #0c0d10), linear-gradient(120deg, #f97316, #2563eb);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}

@media (prefers-reduced-motion: reduce) {
  .hsn-ring-spin { animation: none; }
  .hsn-pill:hover .hsn-spark { animation: none; }
  .hsn-pill, .hsn-pill-shine, .hsn-cta { transition: none; }
}
</style>
