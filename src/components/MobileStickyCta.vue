<template>
  <!-- 모바일 전용 하단 고정 바 (md 이상 숨김) — 숨기는 경로는 App.vue가 homeCta.showStickyCta로 정한다.
       QuickMenu는 App.vue가 raised를 넘겨 이 바 위로 올린다. 바 높이만큼 페이지 끝에 빈 칸(sticky-spacer)을 둔다 -->
  <div class="md:hidden" data-mobile-sticky-cta>
    <div class="sticky-spacer" aria-hidden="true"></div>
    <nav class="sticky-bar" aria-label="빠른 문의">
      <router-link :to="STUDIO_PATH" class="sticky-btn sticky-btn-studio" data-sticky-studio @click="trackStudioCta('sticky')">
        <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i> 스튜디오 둘러보기
      </router-link>
      <a :href="KAKAO_CHAT_URL" target="_blank" rel="noopener noreferrer" class="sticky-btn sticky-btn-kakao" data-sticky-kakao>
        <i class="fas fa-comment" aria-hidden="true"></i> 카톡 문의
      </a>
    </nav>
  </div>
</template>

<script setup>
import { KAKAO_CHAT_URL, STUDIO_PATH, trackStudioCta } from '@/lib/homeCta'
</script>

<style scoped>
/* 바 높이 = 위아래 여백 10px×2 + 버튼 44px = 64px (+ 아이폰 아래 안전 영역) — QuickMenu의 qm-raised가 이 값 + 12px 위에 선다 */
.sticky-spacer { height: calc(64px + env(safe-area-inset-bottom, 0px)); }
.sticky-bar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
  display: flex; gap: 8px; padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 255, 255, 0.96); border-top: 1px solid #e5e7eb; box-shadow: 0 -6px 18px rgba(15, 23, 42, 0.08);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
}
.sticky-btn {
  flex: 1 1 0; min-width: 0; height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border-radius: 12px; font-size: 14.5px; font-weight: 900; white-space: nowrap;
}
.sticky-btn:active { transform: scale(0.97); }
.sticky-btn-studio { background: #f59e0b; color: #1f1403; }
.sticky-btn-kakao { background: #fee500; color: #191919; }
</style>
