<template>
  <div class="st-surface st-border rounded-[10px] p-3 space-y-1.5" :data-mk-use-common="market">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] st-ink">
      <span class="st-desc-sm">{{ USE_COMMON_LABEL }}:</span>
      <label v-for="g in groups" :key="g.key" class="flex items-center gap-1.5">
        <input type="checkbox" :checked="use[g.key] !== false" :disabled="disabled" :data-mk-use-common-check="g.key" @change="$emit('toggle', g.key, $event.target.checked)" /> {{ g.label }}
      </label>
    </div>
    <p class="st-desc-sm break-keep">{{ USE_COMMON_NOTE }} 대표 이미지는 공통 정보에서 고릅니다.</p>
  </div>
</template>

<script setup>
// 판매처 섹션 맨 위 [공통 정보 사용] 체크 줄 (2026-10-02 ②-1) — 처음에는 모두 체크. 값 옮기기는 부르는 섹션(useSendCommon·쿠팡 섹션)이 한다
import { USE_COMMON_LABEL, USE_COMMON_NOTE } from '@/lib/studioSendCommon'

defineProps({
  market: { type: String, required: true },
  groups: { type: Array, required: true }, // studioSendCommon COMMON_GROUPS | COUPANG_GROUPS
  use: { type: Object, required: true },   // { [key]: boolean }
  disabled: { type: Boolean, default: false },
})
defineEmits(['toggle']) // (key, on)
</script>
