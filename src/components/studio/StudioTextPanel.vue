<template>
  <div class="flex flex-col h-full overflow-y-auto" data-text-panel>
    <div class="px-4 pt-4 pb-4 space-y-3">
      <div class="text-[13px] font-extrabold st-ink">글자 넣기</div>
      <p class="st-desc break-keep">누르면 지금 보고 있는 섹션 가운데에 들어가요. 바로 글자를 입력할 수 있어요.</p>
      <div class="space-y-2">
        <button
          v-for="k in KINDS" :key="k.key" type="button" class="st-text-add" :data-text-add="k.key"
          :disabled="disabled" @click="$emit('insert', k.key)"
        >
          <span class="st-text-add-sample" :style="{ fontSize: `${k.size}px`, fontWeight: k.weight }">{{ k.label }}</span>
          <span class="st-desc-sm">{{ k.hint }}</span>
        </button>
      </div>
      <p v-if="disabled" class="st-desc-sm break-keep">페이지가 준비되면 글자를 넣을 수 있어요.</p>
    </div>
    <!-- 스타일 프리셋 (10-2): 견본은 실제 글자 그리기(StudioTextView)로 그 모양 그대로 -->
    <div class="px-4 pb-4 space-y-2 st-border-t pt-4" data-style-presets>
      <div class="text-[13px] font-extrabold st-ink">스타일</div>
      <p class="st-desc-sm break-keep">글자를 골라 두고 누르면 그 모양으로 바뀌어요. 고른 글자가 없으면 이 모양으로 새 글자가 들어가요.</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="s in swatches" :key="s.key" type="button" class="st-style-card" :title="s.label" :data-style-preset="s.key"
          :disabled="disabled" @click="$emit('style', s.key)"
        >
          <span class="st-style-sample" :style="{ background: s.bg }">
            <span class="relative block" :style="{ width: `${s.item.w * SWATCH_SCALE}px`, height: `${s.item.h * SWATCH_SCALE}px` }">
              <StudioTextView :item="s.item" :lines="s.lines" :scale="SWATCH_SCALE" />
            </span>
          </span>
          <span class="st-style-name">{{ s.label }}</span>
        </button>
      </div>
    </div>
    <div class="px-4 pb-4 space-y-1.5">
      <p class="st-desc-sm break-keep">글자를 두 번 누르거나, 고른 뒤 Enter를 누르면 고칠 수 있어요. Esc나 바깥을 누르면 끝나요.</p>
      <p class="st-desc-sm break-keep">글꼴은 모두 상업용으로 무료로 쓸 수 있는 한글 글꼴이에요.</p>
    </div>
  </div>
</template>

<script setup>
// 왼쪽 [텍스트] 패널 (10-1) — 제목·부제목·본문 넣기. 누르면 insert(종류)만 보낸다 — 넣기·고르기·고치기 시작은 편집기가 한다.
// 10-2: 스타일 프리셋 목록 — 누르면 style(프리셋 키)만 보낸다 (고른 글자에 적용 / 없으면 새 글자는 편집기가 정한다)
import { computed, inject } from 'vue'
import { TEXT_STYLE_PRESETS, normalizeTextItem, presetPatch, fitTextItem, wrapLines, textStyleOf } from '@/lib/studioText'
import StudioTextView from '@/components/studio/StudioTextView.vue'

defineProps({
  disabled: { type: Boolean, default: false }, // 페이지가 없을 때
})
defineEmits(['insert', 'style'])

// 견본: 페이지 px 기준 글자 26px · 폭 220 → 화면에서 절반 크기로 (카드 폭에 들어가게)
const SWATCH_SCALE = 0.5
const textLayout = inject('studioTextLayout') // 편집기와 같은 측정 — 글꼴을 받으면(epoch) 다시 잰다
const swatches = computed(() => {
  textLayout.epoch.value
  return TEXT_STYLE_PRESETS.map(p => {
    const base = normalizeTextItem({ id: `swatch-${p.key}`, type: 'text', text: p.sample, x: 0, y: 0, w: 220, h: 1, fontSize: 26, lineHeight: 1.2, ...presetPatch(p) })
    const item = fitTextItem(base, textLayout.measure)
    return { key: p.key, label: p.label, bg: p.swatchBg, item, lines: wrapLines(item.text, textStyleOf(item), item.w, textLayout.measure) }
  })
})

const KINDS = [
  { key: 'title', label: '제목 넣기', hint: '큰 글자', size: 20, weight: 800 },
  { key: 'subtitle', label: '부제목 넣기', hint: '중간 글자', size: 16, weight: 700 },
  { key: 'body', label: '본문 넣기', hint: '작은 글자 · 여러 줄', size: 13, weight: 400 },
]
</script>

<style scoped>
.st-text-add {
  width: 100%; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding: 12px 14px; border-radius: 10px;
  border: 1px solid var(--st-line-strong); background: var(--st-card); color: var(--st-ink); cursor: pointer; text-align: left;
}
.st-text-add:hover:not(:disabled) { border-color: var(--st-accent); }
.st-text-add:disabled { opacity: 0.45; cursor: default; }
.st-text-add-sample { font-family: 'Noto Sans KR', sans-serif; line-height: 1.2; }
/* 스타일 견본 (10-2) */
.st-style-card {
  display: flex; flex-direction: column; gap: 4px; padding: 4px; border-radius: 10px; cursor: pointer; text-align: left;
  border: 1px solid var(--st-line-strong); background: var(--st-card);
}
.st-style-card:hover:not(:disabled) { border-color: var(--st-accent); }
.st-style-card:disabled { opacity: 0.45; cursor: default; }
.st-style-sample { height: 56px; border-radius: 7px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.st-style-name { padding: 0 2px 2px; font-size: 11px; font-weight: 700; color: var(--st-ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
