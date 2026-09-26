<template>
  <div class="flex flex-col h-full overflow-y-auto" data-text-panel>
    <div class="px-4 pt-4 pb-4 space-y-3">
      <div class="text-[13px] font-extrabold st-ink">글자 넣기</div>
      <p class="st-desc break-keep">누르면 지금 보고 있는 구간 가운데에 들어가요. 바로 글자를 입력할 수 있어요.</p>
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
    <div class="px-4 pb-4 space-y-1.5">
      <p class="st-desc-sm break-keep">글자를 두 번 누르거나, 고른 뒤 Enter를 누르면 고칠 수 있어요. Esc나 바깥을 누르면 끝나요.</p>
      <p class="st-desc-sm break-keep">글꼴은 모두 상업용으로 무료로 쓸 수 있는 한글 글꼴이에요.</p>
    </div>
  </div>
</template>

<script setup>
// 왼쪽 [텍스트] 패널 (10-1) — 제목·부제목·본문 넣기. 누르면 insert(종류)만 보낸다 — 넣기·고르기·고치기 시작은 편집기가 한다.
defineProps({
  disabled: { type: Boolean, default: false }, // 페이지가 없을 때
})
defineEmits(['insert'])

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
</style>
