<template>
  <div class="absolute inset-0 flex items-center justify-center p-6 st-auto-screen" style="z-index: 45" data-auto-screen :data-auto-phase="state.phase">
    <div class="w-full max-w-[560px] st-card st-shadow-float p-7">
      <div class="flex items-center gap-2.5">
        <span class="st-auto-icon"><Sparkles class="w-5 h-5" :stroke-width="2" /></span>
        <div>
          <h2 class="text-[19px] font-extrabold st-ink">원클릭 AI 자동 제작</h2>
          <p class="st-desc-sm">사진을 한 장씩 살펴 페이지를 만들고 있어요. 이 창을 닫지 말고 기다려 주세요.</p>
        </div>
      </div>

      <!-- 단계: 사진 고르기 → 글자 찾기·지우기 n/N장 → 페이지 배치 → 글자 초안 -->
      <ol class="mt-6 space-y-3" data-auto-steps>
        <li v-for="s in steps" :key="s.key" class="flex items-start gap-3" :data-auto-step="s.key" :data-auto-step-state="s.state">
          <span class="st-auto-dot" :class="`is-${s.state}`">
            <Check v-if="s.state === 'done'" class="w-3.5 h-3.5" :stroke-width="3" />
            <X v-else-if="s.state === 'error'" class="w-3.5 h-3.5" :stroke-width="3" />
            <Loader2 v-else-if="s.state === 'active'" class="w-3.5 h-3.5 animate-spin" :stroke-width="2.5" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-[14px] font-bold" :class="s.state === 'wait' ? 'st-muted' : 'st-ink'">{{ s.label }}</div>
            <div v-if="s.note" class="st-desc-sm break-keep" :data-auto-note="s.key">{{ s.note }}</div>
          </div>
        </li>
      </ol>

      <div class="mt-5 st-progress" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100"><div :style="{ width: `${percent}%` }" /></div>
      <div class="mt-2 flex items-center text-[12px]">
        <span class="st-ink-2 font-bold tabular-nums" data-auto-count>{{ state.total ? `${state.done} / ${state.total}장` : '' }}</span>
        <span class="ml-auto st-muted" data-auto-eta>{{ etaText }}</span>
      </div>
      <p class="mt-2 text-[12px] st-muted break-keep" data-auto-tally>{{ tally }}</p>
      <p v-if="state.error" class="mt-3 text-[13px] font-bold st-danger-text break-keep" data-auto-error>{{ state.error }}</p>

      <div class="mt-6 flex items-center gap-2">
        <p class="st-desc-sm break-keep flex-1">{{ state.error ? '페이지와 사진 목록은 그대로예요. 닫고 다시 눌러 주세요.' : '멈추면 여기까지 된 사진으로 페이지를 만들어요.' }}</p>
        <button v-if="state.error" type="button" class="st-btn" data-auto-close @click="$emit('close')">닫기</button>
        <button
          v-else type="button" class="st-btn" :disabled="state.stopRequested || state.phase === 'layout' || state.phase === 'done'" data-auto-stop
          @click="$emit('stop')"
        ><Square class="w-3.5 h-3.5" :stroke-width="2.5" /> {{ state.stopRequested ? '멈추는 중…' : '멈추기' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// 원클릭 진행 화면 (원클릭 1단계) — 편집기 가운데를 덮는다. 상태는 useAutoBuild.state 그대로 받는다.
// 이 화면 안에서만 "사진 속 글자를 찾는 중"처럼 무엇을 하는지 풀어 말한다(편집기 문구 규칙 — 편집기 화면에는 전용 표현을 쓰지 않음).
import { computed } from 'vue'
import { Sparkles, Check, Loader2, Square, X } from 'lucide-vue-next'

const props = defineProps({
  state: { type: Object, required: true }, // useAutoBuild.state
})
defineEmits(['stop', 'close'])

const PHASE_RANK = { idle: 0, prepare: 1, photos: 2, layout: 3, done: 4 }
const rank = computed(() => PHASE_RANK[props.state.phase] ?? 0)

const photoNote = computed(() => {
  const s = props.state
  if (rank.value < 2) return ''
  if (rank.value > 2) return `${s.done}장을 살펴봤어요`
  if (s.stopRequested) return '지금 사진까지만 하고 멈출게요'
  if (s.waitingAi) return 'AI 지우기를 준비하는 중이에요 (처음 한 번은 1~3분 걸려요)'
  if (s.stage === 'load') return '사진을 불러오는 중'
  if (s.stage === 'ocr') return '사진 속 글자를 찾는 중'
  if (s.stage === 'erase') return s.layer ? `찾은 글자를 지우는 중 (${s.layer.i}/${s.layer.n}곳)` : '찾은 글자를 지우는 중'
  return ''
})
const prepareNote = computed(() => {
  const p = props.state.prepare
  if (rank.value !== 1) return rank.value > 1 ? '준비됐어요' : ''
  if (props.state.error) return '글자 찾기 모델을 받지 못했어요'
  if (p.total > 0 && p.loaded < p.total) return `글자 찾기를 준비하는 중 ${Math.round((p.loaded / p.total) * 100)}% (처음 한 번만 받아요)`
  return '글자 찾기를 준비하는 중'
})

const steps = computed(() => {
  const r = rank.value
  // 멈춘 단계(오류)는 'error' — 뒤 단계는 대기 그대로 (review-1: 실패인데 모두 완료처럼 보이지 않게)
  const st = n => (r > n ? 'done' : r === n ? (props.state.error ? 'error' : 'active') : 'wait')
  return [
    { key: 'pick', label: '사진 고르기', state: st(1), note: prepareNote.value },
    { key: 'photos', label: `글자 찾기·지우기${props.state.total ? ` ${Math.min(props.state.done + (r === 2 ? 1 : 0), props.state.total)}/${props.state.total}장` : ''}`, state: st(2), note: photoNote.value },
    { key: 'layout', label: '페이지 배치', state: st(3) === 'done' || r >= 4 ? 'done' : st(3), note: '' },
    { key: 'text', label: '글자 초안', state: r >= 4 ? 'done' : st(3), note: r === 3 ? '1688 상품 정보로 상품명·소재·옵션을 적는 중' : '' },
  ]
})

const percent = computed(() => {
  const s = props.state
  if (rank.value >= 4) return 100
  if (rank.value === 3) return 95
  if (!s.total) return rank.value === 1 ? 3 : 5
  return Math.min(92, 5 + Math.round((s.done / s.total) * 87))
})
const etaText = computed(() => {
  const s = props.state
  if (rank.value !== 2) return ''
  if (s.etaMs === null) return '남은 시간 계산 중'
  const min = Math.ceil(s.etaMs / 60000)
  return s.etaMs < 60000 ? '1분 안에 끝나요' : `약 ${min}분 남았어요`
})
const tally = computed(() => {
  const c = props.state.counts
  const parts = []
  if (c.erased) parts.push(`다듬음 ${c.erased}`)
  if (c.clean) parts.push(`그대로 ${c.clean}`)
  if (c.kept) parts.push(`직접 고친 사진 ${c.kept}`)
  if (c.textHeavy) parts.push(`글자 많음 ${c.textHeavy}(페이지에서 뺌)`)
  if (c.textLeft) parts.push(`글자 남음 ${c.textLeft}`)
  if (c.failed) parts.push(`지우기 실패 ${c.failed}`)
  if (c.dup + c.small) parts.push(`겹치거나 작은 사진 ${c.dup + c.small}`)
  return parts.join(' · ')
})
</script>

<style scoped>
.st-auto-screen { background: color-mix(in srgb, var(--st-bg) 92%, transparent); }
.st-auto-icon {
  display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px;
  background: var(--st-ai); color: var(--st-ai-text); flex-shrink: 0;
}
.st-auto-dot {
  display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 999px; margin-top: 1px; flex-shrink: 0;
  border: 2px solid var(--st-line-strong); color: var(--st-ink);
}
.st-auto-dot.is-active { border-color: var(--st-accent); color: var(--st-accent); }
.st-auto-dot.is-error { border-color: var(--st-danger); background: var(--st-danger); color: #fff; }
.st-auto-dot.is-done { border-color: var(--st-accent); background: var(--st-accent); color: #fff; }
</style>
