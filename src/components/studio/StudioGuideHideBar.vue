<template>
  <!-- 사용가이드가 떠 있는 동안 화면 아래 가운데 — "다시 보지 않기" (SpotlightGuide 본체는 고치지 않고 옆에 둔다, 결정 12) -->
  <Teleport to="body">
    <div v-if="open" class="studio-root st-dark fixed left-1/2 -translate-x-1/2 bottom-5 st-guide-hide" data-guide-hide-bar>
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" class="w-4 h-4 accent-[var(--st-accent)]" :checked="checked" data-guide-hide @change="$emit('update:checked', $event.target.checked)" />
        <span class="text-[13px] font-bold st-ink">다시 보지 않기</span>
      </label>
      <span class="text-[12px] st-muted break-keep">{{ note }}</span>
    </div>
  </Teleport>
</template>

<script setup>
// 체크하면 바로 기억한다 (편집기가 studioGuide.writeGuideHidden). 풀면 다음에 열 때 다시 자동으로 떠요.
defineProps({
  open: { type: Boolean, default: false },
  checked: { type: Boolean, default: false },
  note: { type: String, default: '다음에 열 때 자동으로 띄우지 않아요. [가이드]로 언제든 다시 볼 수 있어요.' },
})
defineEmits(['update:checked'])
</script>

<style scoped>
/* SpotlightGuide(z-index 130) 위에 — 가이드 바깥은 누를 수 없지만 이 막대는 누를 수 있게 */
.st-guide-hide {
  z-index: 140; display: flex; align-items: center; gap: 14px; padding: 10px 16px; border-radius: 14px;
  background: var(--st-panel); border: 1px solid var(--st-line); box-shadow: 0 16px 40px -12px rgba(0, 0, 0, .6);
  max-width: calc(100vw - 32px);
}
</style>
