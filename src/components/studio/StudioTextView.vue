<template>
  <!-- 글자 요소 그리기 (10-1) — 페이지 크기로 그린 뒤 배율(scale)만 곱한다: 줄은 wrapLines 결과를 한 줄씩(white-space: pre),
       브라우저 자동 줄바꿈에 맡기지 않는다 → 내보내기(캔버스, 13단계)와 같은 줄 -->
  <div class="absolute left-0 top-0 pointer-events-none" :style="outer" data-text-view>
    <div class="w-full h-full" :style="inner">
      <div v-for="(ln, i) in lines" :key="i" class="st-text-line" :style="lineStyle">{{ ln }}</div>
    </div>
  </div>
</template>

<script setup>
// 페이지(StudioPageView)·구간 작은 그림(StudioSectionThumb)이 같이 쓴다. 자리·회전·투명도는 바깥 요소가 맡고, 여기서는 글자와 뒤집기만.
import { computed } from 'vue'
import { cssFamilyOf } from '@/lib/studioFonts'

const props = defineProps({
  item: { type: Object, required: true },  // 글자 요소 (studioText 모양)
  lines: { type: Array, required: true },  // wrapLines 결과
  scale: { type: Number, required: true }, // 화면 배율
})

const outer = computed(() => ({
  width: `${props.item.w}px`, height: `${props.item.h}px`, transform: `scale(${props.scale})`, transformOrigin: '0 0',
}))
const inner = computed(() => {
  const it = props.item
  const sx = it.flipX ? -1 : 1, sy = it.flipY ? -1 : 1
  return {
    fontFamily: cssFamilyOf(it.fontFamily), fontWeight: it.fontWeight, fontSize: `${it.fontSize}px`, color: it.color,
    textAlign: it.align, letterSpacing: `${it.letterSpacing}em`,
    transform: sx === 1 && sy === 1 ? null : `scale(${sx}, ${sy})`,
  }
})
const lineStyle = computed(() => {
  const lh = props.item.fontSize * props.item.lineHeight
  return { height: `${lh}px`, lineHeight: `${lh}px` }
})
</script>

<style scoped>
.st-text-line { white-space: pre; overflow: visible; }
</style>
