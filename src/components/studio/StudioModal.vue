<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" @click.self="$emit('close')">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5" role="dialog" aria-modal="true">
        <h3 v-if="title" class="text-base font-black text-slate-900">{{ title }}</h3>
        <div class="mt-2 text-sm text-slate-600">
          <slot />
        </div>
        <div class="mt-5 flex flex-wrap justify-end gap-2">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// 스튜디오 화면 안 모달 — 브라우저 기본 alert/confirm/prompt 대신 쓴다
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
})
defineEmits(['close'])
</script>
