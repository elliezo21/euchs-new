<template>
  <div class="absolute inset-0 flex items-center justify-center p-6 st-start" style="z-index: 6" data-start-screen>
    <!-- 1) 두 카드: [원클릭 AI 자동 제작](원클릭 1단계 — 누르면 편집기가 원클릭을 돌린다, emit 'oneclick') / [직접 만들기] -->
    <div v-if="stage === 'mode'" class="w-full max-w-[720px]" data-start-stage="mode">
      <h2 class="text-[22px] font-extrabold st-ink text-center">어떻게 만들까요?</h2>
      <p class="mt-1.5 text-center st-desc break-keep">
        {{ usableCount > 0 ? `사진 ${usableCount}장이 준비됐어요.` : '사진을 올리면 바로 시작할 수 있어요.' }}
      </p>
      <div class="mt-7 grid grid-cols-2 gap-4">
        <button
          type="button" class="st-start-card is-ai" :class="canBlank ? '' : 'is-off'" :disabled="!canBlank" data-start-card="ai"
          @click="canBlank && $emit('oneclick')"
        >
          <div class="flex items-center gap-2">
            <span class="st-start-icon is-ai"><Sparkles class="w-5 h-5" :stroke-width="2" /></span>
            <span class="st-badge ml-auto">완전 자동</span>
          </div>
          <div class="mt-4 text-[17px] font-extrabold st-ink">원클릭 AI 자동 제작</div>
          <p class="mt-1.5 st-desc break-keep">
            {{ canBlank ? '사진을 골라 다듬고, 페이지 배치와 글자 초안까지 AI가 자동으로 만들어요(한 번에 30장까지). 처음 한 번은 준비에 1~3분 걸려요. 만든 페이지는 여기서 바로 고칠 수 있어요.' : '먼저 왼쪽 [사진]에서 사진을 올려 주세요.' }}
          </p>
        </button>
        <button type="button" class="st-start-card" data-start-card="manual" @click="stage = 'source'">
          <div class="flex items-center gap-2">
            <span class="st-start-icon"><Hand class="w-5 h-5" :stroke-width="2" /></span>
            <span class="st-badge st-badge-accent ml-auto">지금 쓸 수 있어요</span>
          </div>
          <div class="mt-4 text-[17px] font-extrabold st-ink">직접 만들기</div>
          <p class="mt-1.5 st-desc break-keep">준비된 사진으로 페이지를 만들고, 원하는 대로 하나씩 다듬어요.</p>
        </button>
      </div>
    </div>

    <!-- 3) [템플릿으로 시작] → 템플릿 고르기 (15단계 — 왼쪽 [템플릿] 패널과 같은 목록) -->
    <div v-else-if="stage === 'template'" class="w-full max-w-[720px] max-h-full overflow-y-auto" data-start-stage="template">
      <button type="button" class="st-btn st-btn-ghost" data-start-back @click="stage = 'source'">
        <ArrowLeft class="w-4 h-4" :stroke-width="2" /> 뒤로
      </button>
      <h2 class="mt-3 text-[22px] font-extrabold st-ink text-center">어떤 틀로 시작할까요?</h2>
      <StudioTemplatePanel embedded :images="images" :views="views" class="mt-3" @apply="$emit('template', $event)" />
    </div>

    <!-- 2) [직접 만들기] → 빈 페이지에서 시작 / 템플릿으로 시작 -->
    <div v-else class="w-full max-w-[720px]" data-start-stage="source">
      <button type="button" class="st-btn st-btn-ghost" data-start-back @click="stage = 'mode'">
        <ArrowLeft class="w-4 h-4" :stroke-width="2" /> 뒤로
      </button>
      <h2 class="mt-3 text-[22px] font-extrabold st-ink text-center">어디서 시작할까요?</h2>
      <div class="mt-7 grid grid-cols-2 gap-4">
        <button
          type="button" class="st-start-card" :class="canBlank ? '' : 'is-off'" :disabled="!canBlank" data-start-card="blank"
          @click="canBlank && $emit('blank')"
        >
          <span class="st-start-icon"><LayoutList class="w-5 h-5" :stroke-width="2" /></span>
          <div class="mt-4 text-[17px] font-extrabold st-ink">빈 페이지에서 시작</div>
          <p class="mt-1.5 st-desc break-keep">
            {{ canBlank ? `준비된 사진 ${usableCount}장이 순서대로 자리에 들어가요. 바로 고쳐 쓸 수 있어요.` : '먼저 왼쪽 [사진]에서 사진을 올려 주세요.' }}
          </p>
        </button>
        <button
          type="button" class="st-start-card" :class="canBlank ? '' : 'is-off'" :disabled="!canBlank" data-start-card="template"
          @click="canBlank && (stage = 'template')"
        >
          <span class="st-start-icon"><LayoutTemplate class="w-5 h-5" :stroke-width="2" /></span>
          <div class="mt-4 text-[17px] font-extrabold st-ink">템플릿으로 시작</div>
          <p class="mt-1.5 st-desc break-keep">
            {{ canBlank ? '어울리는 틀을 고르면 사진이 알맞은 자리에 들어가요.' : '먼저 왼쪽 [사진]에서 사진을 올려 주세요.' }}
          </p>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// 시작 화면 ⓪ (16단계) — 페이지가 비어 있는 작업(DB page = null)을 열면 편집기 가운데에 띄운다 (studioStart.shouldShowStart).
// 왼쪽 사진 목록·[내 사진 올리기]는 그대로 쓸 수 있다(가운데만 덮는다). 누르면 부모가 기본 배치를 저장한다(emit 'blank').
// 15단계: [템플릿으로 시작] → 템플릿 고르기 → 부모가 그 템플릿으로 페이지를 만들어 저장한다(emit 'template', key).
//   쓸 사진이 0장이면 [빈 페이지에서 시작]과 같은 이유로 막는다(빈 사진 자리 페이지가 저장되면 나중 사진이 자동으로 안 들어가서).
import { ref, computed } from 'vue'
import { Sparkles, Hand, ArrowLeft, LayoutList, LayoutTemplate } from 'lucide-vue-next'
import { canStartBlank } from '@/lib/studioStart'
import StudioTemplatePanel from '@/components/studio/StudioTemplatePanel.vue'

const props = defineProps({
  usableCount: { type: Number, default: 0 }, // 페이지에 넣을 수 있는 사진 수 (준비 끝 + 안 쓸 사진 아님)
  images: { type: Array, default: () => [] },  // 템플릿 미리보기에 넣어 볼 쓸 사진 (자른 크기)
  views: { type: Object, default: () => ({}) }, // 화면용 작은 사진
})
defineEmits(['blank', 'template', 'oneclick'])

const stage = ref('mode') // 'mode' 두 카드 | 'source' 빈 페이지·템플릿 | 'template' 템플릿 고르기
const canBlank = computed(() => canStartBlank(props.usableCount))
</script>

<style scoped>
.st-start { background: var(--st-bg); }
.st-start-card {
  display: block; width: 100%; min-height: 188px; padding: 20px; text-align: left;
  border-radius: var(--st-radius-lg, 16px); background: var(--st-card); border: 1px solid var(--st-line);
  cursor: pointer; transition: border-color .15s, background .15s;
}
.st-start-card:hover:not(.is-off) { border-color: var(--st-accent); background: var(--st-card-hover, var(--st-card)); }
.st-start-card:focus-visible { outline: 2px solid var(--st-accent); outline-offset: 2px; }
.st-start-card.is-off { cursor: not-allowed; opacity: .55; }
.st-start-card.is-ai { border-color: color-mix(in srgb, var(--st-ai) 45%, transparent); }
.st-start-icon {
  display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px;
  background: var(--st-accent-soft); color: var(--st-accent);
}
.st-start-icon.is-ai { background: var(--st-ai); color: var(--st-ai-text); }
</style>
