<template>
  <div class="px-4 sm:px-12 py-9 max-w-5xl">
    <div class="st-card p-6 sm:p-8">
      <h2 class="st-h-page">사용량</h2>
      <p class="mt-2 st-desc">준비 중이에요.</p>
    </div>
  </div>
</template>

<script setup>
// 이번 달 번역 장수·남은 한도·상품 조회 횟수 화면 — 껍데기 (Phase 1-2)
import { onMounted, onUnmounted } from 'vue'

// 로그아웃 구독 (CLAUDE.md 2-9) — 라우터 가드는 beforeEach라 라우팅이 없으면 돌지 않으므로
// 이 화면이 개인 데이터를 갖게 되면(Phase 1-3) 여기서 그 상태를 비운다.
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    // 로그아웃: 지금은 비울 개인 데이터가 없다. Phase 1-3에서 이 화면의 상태 초기화를 여기에 둔다.
  }
}

onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
})

onUnmounted(() => {
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
})
</script>
