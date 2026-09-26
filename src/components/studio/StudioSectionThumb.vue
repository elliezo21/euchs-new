<template>
  <!-- 구간 하나의 작은 그림 (8-2) — 배경색 + 사진 요소(자리·크기·회전·뒤집기·투명도). 숨긴 요소·사진 아닌 요소는 그리지 않는다 -->
  <div class="relative overflow-hidden shrink-0" :style="{ width: `${box.w}px`, height: `${box.h}px`, background: section.bg }" data-section-thumb>
    <div v-for="it in shownItems" :key="it.id" class="absolute" :style="itemStyle(it)">
      <img
        v-if="drawImages && views[it.imageId]?.url" :src="views[it.imageId].url" alt="" draggable="false"
        class="block w-full h-full st-thumb-img" :style="imgStyle(it)"
      />
      <div v-else class="w-full h-full st-placeholder" />
    </div>
  </div>
</template>

<script setup>
// 미니뷰·[순서 변경] 화면이 같이 쓴다. 사진은 새로 받지 않는다 — 편집기가 만든 화면용 작은 사진(views[imageId].url)만, 없으면 흐린 자리표시.
// drawImages=false면 사진 대신 자리표시만 (화면 밖 미니뷰 — 가볍게)
import { computed } from 'vue'
import { isValidImageItem } from '@/lib/studioPage'
import { lookCss } from '@/lib/studioLook'

const props = defineProps({
  section: { type: Object, required: true },
  pageWidth: { type: Number, required: true },
  views: { type: Object, required: true },           // image id → { status, url } (studioViewImage)
  looks: { type: Object, default: () => ({}) },       // image id → 필터·조정 (CSS만 — 온도·선명도 SVG는 뺌)
  width: { type: Number, required: true },            // 그림 폭 (px)
  maxHeight: { type: Number, default: 0 },            // 0 = 비율대로 / 있으면 이 높이 안에 들어가게 줄임
  drawImages: { type: Boolean, default: true },
})

const scale = computed(() => {
  const s = props.width / props.pageWidth
  return props.maxHeight > 0 ? Math.min(s, props.maxHeight / props.section.height) : s
})
const box = computed(() => ({ w: Math.max(1, Math.round(props.pageWidth * scale.value)), h: Math.max(1, Math.round(props.section.height * scale.value)) }))
const shownItems = computed(() => props.section.items.filter(it => isValidImageItem(it) && !it.hidden))

function itemStyle(it) {
  const z = scale.value
  return {
    left: `${it.x * z}px`, top: `${it.y * z}px`, width: `${it.w * z}px`, height: `${it.h * z}px`,
    opacity: it.opacity ?? 1, transform: it.rotation ? `rotate(${it.rotation}deg)` : null,
  }
}
function imgStyle(it) {
  const sx = it.flipX ? -1 : 1, sy = it.flipY ? -1 : 1
  const f = lookCss(props.looks[it.imageId])
  return { transform: sx === 1 && sy === 1 ? null : `scale(${sx}, ${sy})`, filter: f || null }
}
</script>

<style scoped>
/* 페이지와 같은 규칙: 자리에 맞춰 채운다 (StudioPageView .st-item-img) */
.st-thumb-img { object-fit: cover; }
</style>
