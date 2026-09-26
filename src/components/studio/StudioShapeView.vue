<template>
  <!-- 도형·선 그리기 (11-1) — studioShape의 paint spec(path d)을 SVG로. 13단계 캔버스는 같은 d를 new Path2D로 그린다.
       viewBox = 요소 페이지 크기 → 화면 배율은 svg 크기로만 (굵기도 같이 줄어든다 = 캔버스에서 scale한 것과 같음) -->
  <svg
    class="absolute left-0 top-0 pointer-events-none" :width="item.w * scale" :height="item.h * scale"
    :viewBox="`0 0 ${item.w} ${item.h}`" preserveAspectRatio="none" overflow="visible" :style="flipStyle" data-shape-view
  >
    <path
      v-if="shapeSpec" :d="shapeSpec.d" :fill="shapeAttrs.fill" :stroke="shapeAttrs.stroke" :stroke-width="shapeAttrs.width"
      :stroke-linejoin="shapeAttrs.join" stroke-miterlimit="10"
    />
    <template v-else-if="lineSpec">
      <path
        :d="lineSpec.line.d" fill="none" :stroke="lineSpec.line.color" :stroke-width="lineSpec.line.width"
        :stroke-dasharray="lineSpec.line.dash ? lineSpec.line.dash.join(' ') : null" :stroke-linecap="lineSpec.line.cap"
      />
      <path v-for="(c, i) in lineSpec.caps" :key="i" :d="c.d" :fill="c.color" />
    </template>
  </svg>
</template>

<script setup>
// 페이지(StudioPageView)·구간 작은 그림(StudioSectionThumb)·[요소] 패널 견본이 같이 쓴다.
// 자리·회전·투명도는 바깥 요소가 맡고, 여기서는 모양과 뒤집기만. stroke-miterlimit 10 = 캔버스 기본값과 같게.
import { computed } from 'vue'
import { isValidShapeItem, isValidLineItem, shapePaintSpec, linePaintSpec } from '@/lib/studioShape'

const props = defineProps({
  item: { type: Object, required: true },  // 도형·선 요소 (studioShape 모양)
  scale: { type: Number, required: true }, // 화면 배율
})

const shapeSpec = computed(() => (isValidShapeItem(props.item) ? shapePaintSpec(props.item) : null))
const lineSpec = computed(() => (isValidLineItem(props.item) ? linePaintSpec(props.item) : null))
// 없는 채우기·테두리 = 'none' (SVG 속성 값)
const shapeAttrs = computed(() => {
  const s = shapeSpec.value
  return {
    fill: s.fill === null ? 'none' : s.fill,
    stroke: s.stroke === null ? 'none' : s.stroke.color,
    width: s.stroke === null ? 0 : s.stroke.width,
    join: s.stroke === null ? 'miter' : s.stroke.join,
  }
})
const flipStyle = computed(() => {
  const sx = props.item.flipX ? -1 : 1, sy = props.item.flipY ? -1 : 1
  return sx === 1 && sy === 1 ? null : { transform: `scale(${sx}, ${sy})`, transformOrigin: 'center' }
})
</script>
