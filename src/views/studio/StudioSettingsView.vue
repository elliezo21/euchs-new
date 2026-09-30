<template>
  <div data-settings-view>
    <div class="px-4 sm:px-12 pt-9 max-w-5xl">
      <h1 class="st-h-page">설정</h1>
      <p class="mt-2 st-desc break-keep">한 번 맞춰 두면 계속 쓰는 값이에요.</p>
    </div>

    <!-- 탭 — 좁은 화면에서는 한 줄로 두고 옆으로 민다 (줄바꿈으로 깨지지 않게) -->
    <div class="mt-5 px-4 sm:px-12 st-border-b overflow-x-auto" data-settings-tabs>
      <nav class="flex gap-1 min-w-max" aria-label="설정 탭">
        <router-link
          v-for="t in SETTINGS_TABS" :key="t.key" :to="{ name: t.route }"
          class="settings-tab" :class="{ 'is-active': route.name === t.route }"
          :aria-current="route.name === t.route ? 'page' : undefined" :data-settings-tab="t.key"
        >{{ t.label }}<span v-if="t.soon" class="st-badge ml-1.5" data-settings-soon>준비 중</span></router-link>
      </nav>
    </div>

    <router-view />
  </div>
</template>

<script setup>
// 스튜디오 설정 — 탭 2개(저장값 | 용어집). 탭마다 자식 라우트 → 주소로 바로 열리고 새로고침해도 그 탭.
// 판매처 연결·배송·반품 템플릿은 사이드바 [판매처](StudioChannelsView)로 옮겼다 (2026-09-30).
// 개인 데이터는 탭 화면이 각자 갖고, 로그아웃 구독도 각자 한다(이 화면은 상태 없음).
import { useRoute } from 'vue-router'
import { SETTINGS_TABS } from '@/lib/studioMarketplaceRules'

const route = useRoute()
</script>

<style scoped>
.settings-tab {
  padding: 10px 14px; font-size: 14px; font-weight: 700; white-space: nowrap;
  color: var(--st-muted); border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.settings-tab:hover { color: var(--st-ink); }
.settings-tab.is-active { color: var(--st-accent); border-bottom-color: var(--st-accent); }
</style>
