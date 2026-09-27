<template>
  <div class="flex flex-col h-full overflow-y-auto" data-bg-panel>
    <div class="px-4 pt-4 pb-4 space-y-3 st-border-b">
      <div class="text-[13px] font-extrabold st-ink">배경 지우기</div>

      <p v-if="!row" class="st-desc break-keep" data-bg-empty>페이지나 [사진] 목록에서 사진을 고르세요</p>

      <template v-else>
        <div class="flex items-center gap-3">
          <div class="st-bg-thumb" :class="bg && bg.mode === 'transparent' ? 'is-checker' : ''" :style="paintColor ? { background: paintColor } : null" data-bg-thumb>
            <img v-if="thumbUrl" :src="thumbUrl" alt="" class="w-full h-full object-contain" draggable="false" />
          </div>
          <div class="min-w-0">
            <div class="text-[12px] font-bold st-ink truncate">{{ rowLabel }}</div>
            <div v-if="bg" class="text-[11px] font-bold st-accent-text" data-bg-mark>{{ markText }}</div>
          </div>
        </div>

        <!-- 결과가 있으면: 원래 배경 / 투명 / 단색 (저장된 마스크만 씀 — 다시 부르지 않는다) -->
        <template v-if="bg">
          <div class="st-seg w-full" role="radiogroup" aria-label="배경 보기">
            <button
              v-for="m in MODES" :key="m.key" type="button" role="radio" :aria-checked="bg.mode === m.key"
              class="st-seg-item flex-1" :class="bg.mode === m.key ? 'is-active' : ''" :data-bg-mode="m.key"
              @click="$emit('mode', m.key)"
            >{{ m.label }}</button>
          </div>
          <p v-if="bg.mode === 'transparent'" class="st-desc-sm break-keep">지운 배경 자리에 구간 배경색이 보여요</p>

          <!-- 단색 (17-2): 견본 · 직접 고르기 · 구간 배경색과 같게 -->
          <div v-if="bg.mode === 'color'" class="space-y-2" data-bg-color-box>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="c in BG_COLOR_SWATCHES" :key="c.value" type="button" class="st-swatch" :class="paintColor === c.value ? 'is-active' : ''"
                :style="{ background: c.value }" :title="c.label" :aria-label="c.label" :data-bg-color="c.value"
                @click="$emit('color', c.value, { commit: true })"
              />
              <label class="st-swatch st-swatch-pick" title="색 고르기" data-bg-color-pick>
                <Pipette class="w-3.5 h-3.5" :stroke-width="2" />
                <input
                  type="color" :value="paintColor || '#ffffff'" class="sr-only"
                  @input="$emit('color', $event.target.value, { commit: false })" @change="$emit('color', $event.target.value, { commit: true })"
                />
              </label>
              <span class="ml-1 text-[11px] font-bold st-muted uppercase" data-bg-color-value>{{ paintColor }}</span>
            </div>
            <button
              type="button" class="st-btn w-full" :disabled="!sectionBg" data-bg-color-section
              :title="sectionBg ? '' : '페이지에 놓인 사진을 고르면 쓸 수 있어요'" @click="$emit('color', sectionBg, { commit: true })"
            >
              <span class="st-swatch-mini" :style="sectionBg ? { background: sectionBg } : null" /> 구간 배경색과 같게
            </button>
          </div>

          <button type="button" class="st-btn w-full" data-bg-reset @click="$emit('reset')">
            <RotateCcw class="w-3.5 h-3.5" :stroke-width="2" /> 배경 원래대로
          </button>
        </template>

        <!-- [배경 지우기] — 자격·준비 상태는 서버가 알려 준 대로 -->
        <template v-else>
          <div v-if="status.loading" class="st-desc-sm" data-bg-status="loading">확인하는 중…</div>
          <template v-else-if="status.reason === 'not_eligible'">
            <button type="button" class="st-btn w-full" disabled data-bg-locked>
              <Lock class="w-3.5 h-3.5" :stroke-width="2" /> 배경 지우기
            </button>
            <p class="st-desc-sm break-keep" data-bg-status="not_eligible">이유씨로 주문한 고객에게 열리는 기능이에요</p>
          </template>
          <template v-else-if="status.reason === 'no_key' || status.reason === 'no_table'">
            <button type="button" class="st-btn w-full" disabled data-bg-soon>
              <Eraser class="w-3.5 h-3.5" :stroke-width="2" /> 배경 지우기 <span class="st-badge ml-1">준비 중</span>
            </button>
            <p class="st-desc-sm break-keep" data-bg-status="not_ready">배경 지우기를 준비하고 있어요. 곧 쓸 수 있어요.</p>
          </template>
          <template v-else-if="status.reason === 'error'">
            <p class="st-desc-sm break-keep" data-bg-status="error">{{ status.message || '상태를 확인하지 못했어요.' }}</p>
            <button type="button" class="st-btn w-full" data-bg-status-retry @click="$emit('retry-status')">다시 확인</button>
          </template>
          <button
            v-else type="button" class="st-btn st-btn-primary w-full" :disabled="busy || !status.ready" data-bg-remove
            @click="$emit('remove')"
          >
            <Loader2 v-if="busy" class="w-3.5 h-3.5 animate-spin" :stroke-width="2" />
            <Eraser v-else class="w-3.5 h-3.5" :stroke-width="2" />
            {{ busy ? '배경 지우는 중…' : '배경 지우기' }}
          </button>
          <p class="st-desc-sm break-keep" data-bg-notice>사진은 배경을 지우기 위해 외부 AI 서비스로 보내져요.</p>
        </template>

        <p v-if="error" class="text-[12px] font-bold st-danger-text break-keep" data-bg-error>{{ error }}</p>
      </template>
    </div>

    <!-- 단색 배경 (17-2) · AI 배경 자리 -->
    <div class="px-4 py-4 space-y-2">
      <div class="flex items-center gap-2" data-bg-solid-row>
        <span class="text-[13px] font-bold st-ink-2">단색 배경</span>
        <button
          v-if="row && !bg" type="button" class="st-btn ml-auto" disabled data-bg-solid-locked
        ><Lock class="w-3.5 h-3.5" :stroke-width="2" /> 단색</button>
      </div>
      <p v-if="row && !bg" class="st-desc-sm break-keep" data-bg-solid-need>먼저 [배경 지우기]를 해 주세요</p>
      <p v-else-if="row && bg && bg.mode !== 'color'" class="st-desc-sm break-keep">위에서 [단색]을 고르면 배경을 한 가지 색으로 채워요</p>
      <div class="flex items-center gap-2" data-bg-soon-item="AI 배경">
        <span class="text-[13px] font-bold st-ink-2">AI 배경</span>
        <span class="st-badge st-badge-outline ml-auto">곧 추가돼요</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * [배경합성] 패널 (17-1·17-2) — 고른 사진의 [배경 지우기] · 원래 배경/투명/단색 · [배경 원래대로]. AI 배경은 자리만.
 * 자격(주문 고객)·준비 상태는 서버(bg_status)가 알려 준 status로만 잠근다. 돈이 드는 요청은 [배경 지우기]를 누를 때 한 번.
 * 단색(17-2)은 AI 없음·무료·자격 검사 없음 — 배경을 지운(마스크가 있는) 사진이면 누구나. 없으면 잠그고 "먼저 [배경 지우기]를 해 주세요".
 *   색 이벤트: ('color', 값, { commit }) — commit false = 색 고르기 칸을 끄는 중(이력 없음), true = 놓음·견본·구간 색(이력 한 칸)
 */
import { computed } from 'vue'
import { Eraser, Lock, Loader2, RotateCcw, Pipette } from 'lucide-vue-next'
import { BG_COLOR_SWATCHES, bgPaintColor, bgMark } from '@/lib/studioBg'

const props = defineProps({
  row: { type: Object, default: null },           // 고른 사진 행 (done)
  thumbUrl: { type: String, default: null },       // 화면 작은 사진 (배경 마스크 적용된 것 — 단색은 아래 색으로)
  bg: { type: Object, default: null },             // { mask, mode, color? } | null
  sectionBg: { type: String, default: null },      // 이 사진이 놓인 구간의 배경색 (없으면 [구간 배경색과 같게] 잠금)
  status: { type: Object, required: true },        // { loading, ready, reason, message }
  busy: { type: Boolean, default: false },         // 이 사진을 처리 중
  error: { type: String, default: '' },
})
defineEmits(['remove', 'mode', 'color', 'reset', 'retry-status'])

const MODES = [
  { key: 'none', label: '원래 배경' },
  { key: 'transparent', label: '투명' },
  { key: 'color', label: '단색' },
]

const paintColor = computed(() => bgPaintColor(props.bg))
const markText = computed(() => bgMark(props.bg) || '배경 지움 · 원래 배경으로 보기')
const rowLabel = computed(() => props.row?.upload_name || (props.row ? `사진 ${Number(props.row.sort_order) + 1}` : ''))
</script>

<style scoped>
.st-bg-thumb {
  width: 64px; height: 64px; flex-shrink: 0; border-radius: 8px; overflow: hidden;
  background: var(--st-card); border: 1px solid var(--st-line);
}
.st-bg-thumb.is-checker {
  background-color: var(--st-card);
  background-image:
    linear-gradient(45deg, var(--st-line) 25%, transparent 25%), linear-gradient(-45deg, var(--st-line) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--st-line) 75%), linear-gradient(-45deg, transparent 75%, var(--st-line) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
}
/* 색 견본 — 어두운 화면에서도 흰색·검정 테두리가 보이게 (구간 패널 견본과 같은 모양) */
.st-swatch {
  width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--st-line-strong); cursor: pointer; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.st-swatch.is-active { box-shadow: 0 0 0 2px var(--st-accent); }
.st-swatch-pick { background: var(--st-card); color: var(--st-ink-2); position: relative; }
.st-swatch-pick:focus-within { border-color: var(--st-accent); }
.st-swatch-mini { width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--st-line-strong); display: inline-block; }
</style>
