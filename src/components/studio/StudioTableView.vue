<template>
  <!-- 사이즈표 그리기 (11-2) — studioTable.tablePaintSpec을 SVG로 (바탕 rect → 선 rect → 글자 text). 13단계 캔버스는 같은 값을 fillRect·fillText로.
       viewBox = 표 페이지 크기 → 화면 배율은 svg 크기로만 -->
  <svg
    class="absolute left-0 top-0 pointer-events-none" :width="item.w * scale" :height="item.h * scale"
    :viewBox="`0 0 ${item.w} ${item.h}`" preserveAspectRatio="none" :style="flipStyle" data-table-view
  >
    <rect v-for="(f, i) in spec.fills" :key="`f${i}`" :x="f.x" :y="f.y" :width="f.w" :height="f.h" :fill="f.color" />
    <rect v-for="(l, i) in spec.lines" :key="`l${i}`" :x="l.x" :y="l.y" :width="l.w" :height="l.h" :fill="l.color" />
    <text
      v-for="(t, i) in spec.texts" :key="`t${i}`" :x="t.x" :y="t.y" :text-anchor="t.anchor" dominant-baseline="central"
      :fill="t.color" :font-family="cssFamilyOf(t.font.fontFamily)" :font-size="t.font.fontSize" :font-weight="t.font.fontWeight"
      xml:space="preserve"
    >{{ t.text }}</text>
  </svg>
</template>

<script setup>
// 페이지(StudioPageView)·구간 작은 그림(StudioSectionThumb)·[요소] 패널 견본이 같이 쓴다.
// 칸 글자 자르기("…")는 편집기가 provide한 글자 폭 재기(studioTextLayout — 글자 요소와 같은 측정)로. 글꼴을 새로 받으면(epoch) 다시 잰다.
// 자리·회전·투명도는 바깥 요소가 맡고, 여기서는 표 모양과 뒤집기만.
import { computed, inject } from 'vue'
import { cssFamilyOf } from '@/lib/studioFonts'
import { tablePaintSpec } from '@/lib/studioTable'

const props = defineProps({
  item: { type: Object, required: true },  // 표 요소 (studioTable 모양)
  scale: { type: Number, required: true }, // 화면 배율
})

const textLayout = inject('studioTextLayout')
const spec = computed(() => {
  textLayout.epoch.value // 글꼴을 받으면 다시 잰다
  return tablePaintSpec(props.item, textLayout.measure)
})
const flipStyle = computed(() => {
  const sx = props.item.flipX ? -1 : 1, sy = props.item.flipY ? -1 : 1
  return sx === 1 && sy === 1 ? null : { transform: `scale(${sx}, ${sy})`, transformOrigin: 'center' }
})
</script>
