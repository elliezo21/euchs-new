<template>
  <div class="px-4 sm:px-12 py-6 max-w-5xl space-y-6" data-mk-shipping-view>
    <p class="st-desc break-keep">상품을 보낼 때 쓸 배송비·반품비·출고지 묶음이에요. 한 번 만들어 두면 보낼 때마다 고르기만 하면 돼요.</p>

    <p v-if="loadError" class="text-[14px] break-keep" :class="loadSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-shipping-error>{{ loadError }}</p>
    <p v-else-if="connected === null" class="st-desc">불러오는 중…</p>

    <!-- 연결 전 -->
    <section v-else-if="!connected" class="st-card p-5 sm:p-6 space-y-3" data-mk-shipping-need-connect>
      <h3 class="st-h-card">먼저 판매처를 연결해 주세요</h3>
      <p class="st-desc break-keep">템플릿은 쿠팡에 등록한 출고지·반품지를 불러와서 만들어요.</p>
      <router-link :to="{ name: 'studio-settings-marketplace' }" class="st-btn st-btn-primary">판매처 연결로 가기</router-link>
    </section>

    <StudioShippingTemplates v-show="connected" ref="templatesRef" />
  </div>
</template>

<script setup>
// 설정 > 배송·반품 템플릿 탭 — 판매처 연결 화면에서 분리 (목록·저장·삭제는 StudioShippingTemplates 그대로)
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import StudioShippingTemplates from '@/components/studio/StudioShippingTemplates.vue'
import { getMarketplaceStatus, isNotReady } from '@/lib/studioMarketplace'

const connected = ref(null) // null = 아직 모름
const loadError = ref('')
const loadSoft = ref(false)
const templatesRef = ref(null)

async function load() {
  loadError.value = ''
  try {
    const st = await getMarketplaceStatus()
    connected.value = st.connected === true
    if (connected.value) {
      await nextTick()
      await templatesRef.value?.load()
    }
  } catch (e) {
    console.error('[StudioShippingView] 상태 조회 실패:', e.code, e)
    loadError.value = e.message
    loadSoft.value = isNotReady(e.code)
  }
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 템플릿·출고지를 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    connected.value = null
    loadError.value = ''
    templatesRef.value?.clear()
  } else {
    load()
  }
}
onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  load()
})
onUnmounted(() => window.removeEventListener('euchs-auth-changed', onStudioAuthChanged))
</script>
