<template>
  <!-- 상태 배지 자리 — 확인 중이면 회색 막대, 못 읽었으면 비움 ("연결 전"으로 보이지 않게) -->
  <span v-if="part === 'badge'" class="ml-auto shrink-0">
    <span v-if="phase === 'checking'" class="st-skeleton pending-pill" aria-label="확인 중" data-mk-link-checking />
  </span>
  <!-- 카드 본문 자리 — 확인 중 = 흐린 줄 두 개(버튼 없음) · 못 읽음 = 한 줄 + [다시 시도] -->
  <div v-else class="mt-4" :data-mk-link-phase="phase">
    <div v-if="phase === 'checking'" class="space-y-2" aria-busy="true">
      <span class="st-skeleton pending-line w-[88%]" />
      <span class="st-skeleton pending-line w-[62%]" />
    </div>
    <p v-else class="text-[13px] break-keep st-muted" data-mk-link-failed>{{ LINK_LOAD_FAILED }}
      <button type="button" class="st-link ml-1" data-mk-link-retry @click="$emit('retry')">다시 시도</button></p>
  </div>
</template>

<script setup>
// 판매처 > 연결 카드의 "불러오는 중 / 못 읽음" 자리 (2026-09-30 깜빡임) — 단계는 studioMarketplaceRules.linkPhase
import { LINK_LOAD_FAILED } from '@/lib/studioMarketplaceRules'

defineProps({ phase: { type: String, required: true }, part: { type: String, default: 'body' } })
defineEmits(['retry'])
</script>

<style scoped>
.pending-pill { display: inline-block; width: 52px; height: 22px; border-radius: 999px; vertical-align: middle; }
.pending-line { display: block; height: 12px; border-radius: 6px; }
</style>
