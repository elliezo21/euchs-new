<template>
  <div v-if="photos.length" class="space-y-2" :data-guide-photos="market">
    <div class="flex items-center gap-3">
      <button type="button" class="st-btn shrink-0" data-guide-photos-open @click="openAt(0)">
        <Images class="w-4 h-4" :stroke-width="2" /> 사진으로 보기
      </button>
      <span class="text-[12px] st-muted">실제 화면 {{ photos.length }}장</span>
    </div>
    <div class="thumbs" data-guide-thumbs>
      <button v-for="(p, i) in photos" :key="p.src" type="button" class="thumb" :title="`${i + 1}. ${p.alt}`" :data-guide-thumb="i" @click="openAt(i)">
        <img :src="p.thumb" :alt="p.alt" loading="lazy" decoding="async" />
        <span class="thumb-no">{{ i + 1 }}</span>
      </button>
    </div>
  </div>

  <!-- 크게 보기 — 연결 창 위에. body로 옮기므로 .studio-root를 직접 단다. 닫아도 연결 창의 입력값은 그대로 -->
  <Teleport to="body">
    <div
      v-if="index >= 0"
      class="studio-root st-modal-overlay viewer fixed inset-0 z-[60] flex flex-col p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      :aria-label="current.alt"
      data-guide-viewer
      @click.self="close"
    >
      <div class="flex items-center gap-2 mb-2 shrink-0">
        <span class="st-badge st-badge-accent" data-guide-viewer-count>{{ index + 1 }} / {{ photos.length }}</span>
        <span class="text-[13px] font-bold text-white truncate">{{ current.alt }}</span>
        <button type="button" class="st-btn ml-auto shrink-0" data-guide-viewer-close @click="close"><X class="w-4 h-4" :stroke-width="2" /> 닫기</button>
      </div>
      <div class="stage" @click.self="close" @touchstart.passive="onTouchStart" @touchend="onTouchEnd">
        <img :src="current.src" :alt="current.alt" class="stage-img" decoding="async" data-guide-viewer-img />
        <button type="button" class="nav nav-prev" :disabled="index === 0" aria-label="이전 사진" data-guide-viewer-prev @click="go(-1)"><ChevronLeft class="w-6 h-6" :stroke-width="2.2" /></button>
        <button type="button" class="nav nav-next" :disabled="index === photos.length - 1" aria-label="다음 사진" data-guide-viewer-next @click="go(1)"><ChevronRight class="w-6 h-6" :stroke-width="2.2" /></button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// 판매처 연결 창의 사진 가이드 (2026-09-30) — 사진 목록은 studioMarketGuides.GUIDE_PHOTOS 한 곳, 사진이 없는 판매처면 아무것도 그리지 않는다.
// 크게 보기: ←/→ 버튼·키, Esc·[닫기]·바깥 누르기 = 닫기, 폰은 좌우로 밀기. 단계 옆 [사진] 링크는 부모가 openAt(n)으로 연다.
import { ref, computed, onUnmounted } from 'vue'
import { Images, X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { guidePhotos } from '@/lib/studioMarketGuides'

const props = defineProps({ market: { type: String, required: true } })
const photos = computed(() => guidePhotos(props.market))
const index = ref(-1)
const current = computed(() => photos.value[index.value] || {})

function openAt(i) {
  if (i < 0 || i >= photos.value.length) return
  index.value = i
  window.addEventListener('keydown', onKey, true)
}
function close() {
  index.value = -1
  window.removeEventListener('keydown', onKey, true)
}
function go(d) {
  const n = index.value + d
  if (n >= 0 && n < photos.value.length) index.value = n
}
// 캡처 단계에서 받아 막는다 — 뒤에 깔린 연결 창·화면 단축키로 새지 않게
function onKey(e) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
  else return
  e.preventDefault()
  e.stopPropagation()
}
let touchX = null
function onTouchStart(e) { touchX = e.touches[0]?.clientX ?? null }
function onTouchEnd(e) {
  if (touchX == null) return
  const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX
  touchX = null
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
}
onUnmounted(() => window.removeEventListener('keydown', onKey, true))
defineExpose({ openAt })
</script>

<style scoped>
.thumbs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.thumb { position: relative; flex: none; width: 88px; height: 58px; border-radius: 8px; overflow: hidden; border: 1px solid var(--st-line); background: var(--st-soft); }
.thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top left; display: block; }
.thumb:hover { border-color: var(--st-accent); }
.thumb-no { position: absolute; left: 4px; top: 4px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 5px; font-size: 11px; font-weight: 800; line-height: 18px; text-align: center; background: var(--st-accent); color: #fff; }
.viewer { background: rgba(8, 9, 12, .9); }
.stage { position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
.stage-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px; background: #fff; user-select: none; -webkit-user-drag: none; }
.nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, .55); color: #fff; }
.nav:disabled { opacity: .25; cursor: default; }
.nav:not(:disabled):hover { background: rgba(0, 0, 0, .75); }
.nav-prev { left: 4px; }
.nav-next { right: 4px; }
</style>
