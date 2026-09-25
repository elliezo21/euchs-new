<template>
  <Teleport to="body">
    <!-- body로 옮겨지므로 토큰이 닿도록 .studio-root를 직접 단다 -->
    <div
      v-if="open"
      class="studio-root st-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <div class="st-modal w-full" :class="wide ? 'max-w-2xl' : 'max-w-md'" role="dialog" aria-modal="true">
        <h3 v-if="title" class="st-modal-title">{{ title }}</h3>
        <div class="mt-2 st-body">
          <slot />
        </div>
        <div v-if="$slots.actions" class="mt-6 flex flex-wrap justify-end gap-2">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// 스튜디오 화면 안 모달 — 브라우저 기본 alert/confirm/prompt 대신 쓴다
// 버튼: 보조 = st-btn, 주요 = st-btn st-btn-primary, 위험 = st-btn st-btn-danger
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  wide: { type: Boolean, default: false },
})
defineEmits(['close'])
</script>
