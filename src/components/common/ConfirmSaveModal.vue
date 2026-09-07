<template>
  <Teleport to="body">
    <Transition name="csm-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <!-- 딤 배경 -->
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" @click="$emit('update:modelValue', false)" />

        <!-- 모달 카드 -->
        <Transition name="csm-scale">
          <div
            v-if="modelValue"
            class="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden"
            @click.stop
          >
            <!-- 상단 아이콘 영역 -->
            <div class="px-6 pt-7 pb-4 flex flex-col items-center text-center">
              <div
                class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                :class="iconBgClass"
              >
                <svg
                  class="w-7 h-7"
                  :class="iconClass"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
               <!-- 저장(disk) 아이콘 -->
                <template v-if="icon === 'save'">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </template>
                <!-- 경고 삼각형 아이콘 (삭제/취소/해제류) -->
                <template v-else-if="icon === 'warn'">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </template>
                <!-- 체크 아이콘 (승인/전환류) -->
                <template v-else>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </template>
                </svg>
              </div>

              <h3 class="text-base font-black text-slate-900 leading-snug">{{ title }}</h3>

              <p v-if="description" class="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-[260px]">
                {{ description }}
              </p>
            </div>

            <!-- 버튼 영역 -->
            <div class="px-6 pb-6 flex items-center gap-2.5">
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 active:scale-95 transition cursor-pointer"
                @click="$emit('update:modelValue', false)"
              >
                {{ cancelText }}
              </button>
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-xl text-white font-black text-sm active:scale-95 transition shadow-sm cursor-pointer"
                :class="confirmBtnClass"
                @click="handleConfirm"
              >
                {{ confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  confirmText: { type: String, default: '저장' },
  cancelText: { type: String, default: '취소' },
  /** 'save' | 'blue' | 'amber' | 'purple' | 'orange' | 'red' */
  variant: { type: String, default: 'save' },
  /** 'save'(디스크) | 'warn'(삼각형 경고) | 'check'(체크) */
  icon: { type: String, default: 'save' },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

function handleConfirm() {
  emit('update:modelValue', false)
  emit('confirm')
}

const iconBgClass = computed(() => {
  const map = {
    save:   'bg-slate-100',
    blue:   'bg-blue-50',
    amber:  'bg-amber-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
    red:    'bg-red-50',
  }
  return map[props.variant] ?? map.save
})

const iconClass = computed(() => {
  const map = {
    save:   'text-slate-600',
    blue:   'text-blue-600',
    amber:  'text-amber-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red:    'text-red-600',
  }
  return map[props.variant] ?? map.save
})

const confirmBtnClass = computed(() => {
  const map = {
    save:   'bg-slate-800 hover:bg-slate-900',
    blue:   'bg-blue-600 hover:bg-blue-700',
    amber:  'bg-amber-500 hover:bg-amber-400 !text-slate-950',
    purple: 'bg-purple-600 hover:bg-purple-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    red:    'bg-red-600 hover:bg-red-700',
  }
  return map[props.variant] ?? map.save
})
</script>

<style scoped>
/* 딤 페이드 */
.csm-fade-enter-active,
.csm-fade-leave-active {
  transition: opacity 0.18s ease;
}
.csm-fade-enter-from,
.csm-fade-leave-to {
  opacity: 0;
}

/* 카드 scale+fade */
.csm-scale-enter-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.csm-scale-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.csm-scale-enter-from,
.csm-scale-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(6px);
}
</style>
