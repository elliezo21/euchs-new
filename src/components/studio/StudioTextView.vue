<template>
  <!-- 글자 요소 그리기 (10-1) — 페이지 크기로 그린 뒤 배율(scale)만 곱한다: 줄은 wrapLines 결과를 한 줄씩(white-space: pre),
       브라우저 자동 줄바꿈에 맡기지 않는다 → 내보내기(캔버스, 13단계)와 같은 줄 -->
  <div class="absolute left-0 top-0 pointer-events-none" :style="outer" data-text-view>
    <div class="relative w-full h-full" :style="inner">
      <!-- 10-2 꾸미기: 배경 → 그림자 → 테두리 → 채우기 (studioText.textPaintSpec 규칙) -->
      <div v-if="paint.bg" class="absolute" :style="bgStyle" data-text-bg />
      <!-- 아래 장: 테두리(두께 × 2, 가운데 기준) + 채우기, 그림자는 이 장 전체(테두리+글자 합친 모양)에 한 번 -->
      <div class="absolute inset-0" :style="baseStyle" data-text-base>
        <div v-for="(ln, i) in lines" :key="i" class="st-text-line" :style="lineStyle">{{ ln }}</div>
      </div>
      <!-- 위 장 (테두리가 있을 때만): 채우기만 — 테두리의 안쪽 절반을 덮어 바깥쪽으로 두께만큼 보이게 (캔버스 strokeText → fillText와 같은 모양) -->
      <div v-if="paint.stroke" class="absolute inset-0" data-text-fill>
        <div v-for="(ln, i) in lines" :key="i" class="st-text-line" :style="lineStyle">{{ ln }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
// 페이지(StudioPageView)·구간 작은 그림(StudioSectionThumb)·[텍스트] 패널 스타일 견본이 같이 쓴다.
// 자리·회전·투명도는 바깥 요소가 맡고, 여기서는 글자·꾸미기·뒤집기(그림자 방향까지 통째로)만.
import { computed } from 'vue'
import { cssFamilyOf } from '@/lib/studioFonts'
import { textPaintSpec } from '@/lib/studioText'

const props = defineProps({
  item: { type: Object, required: true },  // 글자 요소 (studioText 모양)
  lines: { type: Array, required: true },  // wrapLines 결과
  scale: { type: Number, required: true }, // 화면 배율
})

const paint = computed(() => textPaintSpec(props.item))
const outer = computed(() => ({
  width: `${props.item.w}px`, height: `${props.item.h}px`, transform: `scale(${props.scale})`, transformOrigin: '0 0',
}))
const inner = computed(() => {
  const it = props.item
  const sx = it.flipX ? -1 : 1, sy = it.flipY ? -1 : 1
  return {
    fontFamily: cssFamilyOf(it.fontFamily), fontWeight: it.fontWeight, fontSize: `${it.fontSize}px`, color: paint.value.fill,
    textAlign: it.align, letterSpacing: `${it.letterSpacing}em`,
    transform: sx === 1 && sy === 1 ? null : `scale(${sx}, ${sy})`,
  }
})
const bgStyle = computed(() => {
  const b = paint.value.bg
  return { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, borderRadius: `${b.radius}px`, background: b.color }
})
const baseStyle = computed(() => {
  const { stroke, shadow } = paint.value
  return {
    WebkitTextStroke: stroke ? `${stroke.width * 2}px ${stroke.color}` : null,
    filter: shadow ? `drop-shadow(${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.color})` : null,
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
