<template>
  <StudioModal :open="open" wide title="자동으로 만든 페이지예요" @close="$emit('close')">
    <div data-auto-review>
      <p class="break-keep">한 번 둘러보고 마음에 드는 대로 고쳐 주세요. 사진마다 아래 버튼으로 바로 고칠 수 있어요.</p>
      <p class="mt-2 text-[13px] font-bold st-accent-text break-keep" data-auto-draft-note>AI 초안은 확인 후 사용해 주세요. 상품명·소재·옵션 글자는 1688 상품 정보로 만든 초안이라 눌러서 고칠 수 있어요.</p>
      <div class="mt-3 flex flex-wrap gap-1.5" data-auto-summary>
        <span class="st-badge st-badge-accent">페이지 사진 {{ summary.placed }}장</span>
        <span v-if="summary.erased" class="st-badge">다듬음 {{ summary.erased }}장</span>
        <span v-if="summary.failed" class="st-badge st-badge-danger" data-auto-count-review>검수 필요 {{ summary.failed }}장</span>
        <span v-if="summary.textHeavy" class="st-badge st-badge-danger" data-auto-count-heavy>글자 많음 {{ summary.textHeavy }}장</span>
      </div>
      <ul class="mt-2 space-y-0.5 text-[12px] st-muted break-keep">
        <li v-if="summary.textHeavy">글자가 많은 사진은 지워도 비어 보이기 쉬워요. [빼기]나 다른 사진으로 바꾸기를 먼저 권해요.</li>
        <li v-if="stopped">멈춘 뒤의 사진 {{ summary.stopped }}장은 [사진] 목록에 원본으로 있어요.</li>
        <li v-if="summary.overLimit">한 번에 {{ processMax }}장까지 만들어요. 나머지 {{ summary.overLimit }}장은 [사진] 목록에 원본으로 있어요.</li>
        <li v-if="summary.dup + summary.small">겹치거나 작은 사진 {{ summary.dup + summary.small }}장은 페이지에 넣지 않았어요. [사진] 목록에서 넣을 수 있어요.</li>
        <li v-if="draftNote">{{ draftNote }}</li>
      </ul>

      <ol v-if="rows.length" class="mt-4 max-h-[46vh] overflow-y-auto space-y-1.5 pr-1" data-auto-rows>
        <li v-for="r in rows" :key="r.id" class="flex items-center gap-3 p-2 rounded-[10px] st-soft-bg" :data-auto-row="r.id">
          <div class="w-12 h-12 rounded-[8px] overflow-hidden shrink-0 st-placeholder relative">
            <img v-if="r.thumbUrl" :src="r.thumbUrl" alt="" class="w-full h-full object-cover" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[12px] font-bold st-ink-2 truncate">{{ r.label }}</div>
            <div class="text-[12px] font-bold break-keep" :class="r.tone === 'warn' ? 'st-danger-text' : 'st-muted'">{{ r.text }}</div>
          </div>
          <div class="flex flex-wrap justify-end gap-1 shrink-0">
            <button v-if="r.mark?.textHeavy && r.onPage" type="button" class="st-btn st-btn-primary h-8" :data-auto-remove="r.id" @click="$emit('remove', r.id)">빼기</button>
            <button type="button" class="st-btn h-8" :data-auto-fix="r.id" @click="$emit('fix', r.id)">직접 고치기</button>
            <button v-if="r.mark?.canRevert" type="button" class="st-btn h-8" :data-auto-revert="r.id" @click="$emit('revert', r.id)">원본으로</button>
            <button v-if="!r.mark?.textHeavy && r.onPage" type="button" class="st-btn h-8" :data-auto-remove="r.id" @click="$emit('remove', r.id)">빼기</button>
          </div>
        </li>
      </ol>
    </div>
    <template #actions>
      <button type="button" class="st-btn st-btn-primary" data-auto-review-close @click="$emit('close')">확인했어요</button>
    </template>
  </StudioModal>
</template>

<script setup>
// 원클릭 검수 안내 (원클릭 1단계) — 만든 페이지가 열리면 한 번 띄운다. 사진별 [직접 고치기](그 사진의 지우기 화면) ·
// [원본으로](자동으로 지운 것만 빼기 — 사진 이력, Ctrl+Z) · [빼기](페이지에서 빼기 — 페이지 이력, Ctrl+Z). 버튼 동작은 편집기가 한다(목록 줄과 같은 함수).
import StudioModal from '@/components/studio/StudioModal.vue'

defineProps({
  open: { type: Boolean, default: false },
  summary: { type: Object, required: true },   // studioAutoBuild.summarize
  rows: { type: Array, default: () => [] },     // [{ id, label, thumbUrl, text, tone, mark, onPage }]
  stopped: { type: Boolean, default: false },
  processMax: { type: Number, required: true },
  draftNote: { type: String, default: '' },
})
defineEmits(['close', 'fix', 'revert', 'remove'])
</script>
