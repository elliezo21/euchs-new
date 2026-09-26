<template>
  <!-- 진행 단계 표시줄 (6-3) — 상단바 바로 아래 얇은 줄. 잠금이 아니라 안내: 아무 단계나 눌러 옮겨 갈 수 있다 -->
  <div class="h-11 shrink-0 px-3 flex items-center gap-3 st-step-bar" data-step-bar>
    <ol class="flex items-center gap-1 shrink-0" aria-label="진행 단계">
      <li v-for="(s, i) in STUDIO_STEPS" :key="s.no" class="flex items-center gap-1">
        <ChevronRight v-if="i > 0" class="w-3.5 h-3.5 st-step-sep" :stroke-width="2" aria-hidden="true" />
        <button
          type="button" class="st-step" :class="[s.no === step ? 'is-current' : '', s.no < step ? 'is-past' : '']"
          :aria-current="s.no === step ? 'step' : null" :data-step="s.no"
          @click="$emit('go', s.no)"
        >
          <span class="st-step-no"><Check v-if="s.no < step" class="w-3 h-3" :stroke-width="3" /><template v-else>{{ s.no }}</template></span>
          {{ s.label }}
        </button>
      </li>
    </ol>
    <p class="min-w-0 flex-1 text-[12px] st-ink-2 truncate" :title="current.guide" data-step-guide>
      {{ current.guide }}
      <span v-if="current.soon" class="st-step-soon" data-step-soon>곧 열려요</span>
    </p>
    <button v-if="next" type="button" class="st-btn st-step-next shrink-0" data-step-next @click="$emit('go', next.no)">
      다음 단계로 <ArrowRight class="w-3.5 h-3.5" :stroke-width="2.5" />
    </button>
  </div>
</template>

<script setup>
// 손님이 무엇을 어떤 순서로 하는지 보여 주는 줄: ① 사진 다듬기 → ② 페이지 꾸미기 → ③ 내보내기.
// 단계 값·기억은 편집기가 든다 (작업별 localStorage — studioSteps.js). 여기는 그리기만.
import { computed } from 'vue'
import { Check, ChevronRight, ArrowRight } from 'lucide-vue-next'
import { STUDIO_STEPS, stepInfo } from '@/lib/studioSteps'

const props = defineProps({
  step: { type: Number, required: true }, // 1 | 2 | 3
})
defineEmits(['go']) // go(no) 그 단계로 (편집기가 왼쪽 패널을 바꿔 준다)

const current = computed(() => stepInfo(props.step))
const next = computed(() => STUDIO_STEPS.find(s => s.no === props.step + 1) || null)
</script>

<style scoped>
.st-step-bar { background: var(--st-bar); border-bottom: 1px solid var(--st-line); }
.st-step-sep { color: var(--st-muted); }
.st-step {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px 0 5px; border-radius: 999px;
  font-size: 12px; font-weight: 700; color: var(--st-muted); border: 1px solid transparent;
}
.st-step:hover { color: var(--st-ink-2); background: var(--st-card); }
.st-step-no {
  width: 19px; height: 19px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; border: 1.5px solid var(--st-line-strong); color: var(--st-ink-2);
}
.st-step.is-past { color: var(--st-ink-2); }
.st-step.is-past .st-step-no { border-color: var(--st-accent); color: var(--st-accent); }
.st-step.is-current { color: var(--st-ink); background: var(--st-accent-soft); border-color: var(--st-accent-ring); }
.st-step.is-current .st-step-no { background: var(--st-accent); border-color: var(--st-accent); color: var(--st-on-accent); }
.st-step-soon {
  display: inline-block; margin-left: 6px; padding: 0 7px; border-radius: 999px; font-size: 11px; font-weight: 700;
  color: var(--st-ink-2); border: 1px solid var(--st-line-strong);
}
.st-step-next { height: 28px; padding: 0 12px; font-size: 12px; color: var(--st-accent); border-color: var(--st-accent-ring); }
</style>
