<template>
  <span class="st-layer-thumb" :class="dim ? 'is-dim' : ''">
    <img v-if="imageUrl" :src="imageUrl" alt="" draggable="false" class="w-full h-full object-cover" :style="thumbUnderStyle(views[item.imageId])" />
    <img v-else-if="isValidAssetItem(item)" :src="assetUrl(item.asset)" alt="" draggable="false" class="w-full h-full object-contain" />
    <ImageIcon v-else-if="isValidImageItem(item)" class="w-3.5 h-3.5" :stroke-width="2" />
    <Type v-else-if="isValidTextItem(item)" class="w-3.5 h-3.5" :stroke-width="2" />
    <Square v-else-if="isValidShapeItem(item)" class="w-3.5 h-3.5" :stroke-width="2" />
    <MoveRight v-else-if="isValidLineItem(item)" class="w-3.5 h-3.5" :stroke-width="2" />
    <Table2 v-else-if="isValidTableItem(item)" class="w-3.5 h-3.5" :stroke-width="2" />
    <Shapes v-else class="w-3.5 h-3.5" :stroke-width="2" />
  </span>
</template>

<script setup>
// 요소 작은 그림 (28px) — 오른쪽 레이어 목록 줄과 우클릭 "겹친 요소 고르기" 목록이 같이 쓴다.
// 사진은 편집기의 화면용 작은 사진(views)만 — 새로 받지 않는다. 그 밖의 종류는 아이콘
import { computed } from 'vue'
import { Shapes, Type, Square, MoveRight, Table2, Image as ImageIcon } from 'lucide-vue-next'
import { isValidShapeItem, isValidLineItem } from '@/lib/studioShape'
import { isValidTableItem } from '@/lib/studioTable'
import { isValidImageItem } from '@/lib/studioPage'
import { isValidTextItem } from '@/lib/studioText'
import { thumbUnderStyle } from '@/lib/studioViewImage'
import { isValidAssetItem, assetUrl } from '@/lib/studioAsset'

const props = defineProps({
  item: { type: Object, required: true },
  views: { type: Object, required: true },
  dim: { type: Boolean, default: false }, // 숨긴 요소 = 흐리게
})
const imageUrl = computed(() => (isValidImageItem(props.item) ? props.views[props.item.imageId]?.url ?? null : null))
</script>

<style scoped>
.st-layer-thumb {
  flex: none; width: 28px; height: 28px; border-radius: 6px; overflow: hidden; display: inline-flex; align-items: center; justify-content: center;
  background: var(--st-card); color: var(--st-muted); border: 1px solid var(--st-line);
}
.st-layer-thumb.is-dim { opacity: 0.4; }
</style>
