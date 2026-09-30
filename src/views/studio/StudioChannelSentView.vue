<template>
  <div class="px-4 sm:px-12 py-6 max-w-[1560px]" data-ch-sent-view>
    <!-- 예전 내 작업 화면의 [보낸 상품] 그대로 — 판매처별 배지·반려 사유·[고쳐서 다시 보내기]·[상태 새로고침] -->
    <StudioSendList ref="sendList" :exports="exportItems" @update="onUpdate" />
  </div>
</template>

<script setup>
// 판매처 > [보낸 상품] 탭 (2026-09-30) — 목록·동작은 StudioSendList 그대로 (스스로 읽고 로그아웃 구독).
// 카드 사진 = 그 내 상품의 미리보기 → 내 상품 목록을 한 번 읽어 넘긴다. 주소 ?focus=<보낸 기록 id> = 그 줄로 가서 잠깐 표시
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import StudioSendList from '@/components/studio/StudioSendList.vue'
import { listArchives } from '@/lib/studioExportArchive'

const route = useRoute()
const sendList = ref(null)
const exportItems = ref([])
let pendingFocus = typeof route.query.focus === 'string' ? route.query.focus : ''

function onUpdate(list) {
  if (!pendingFocus) return
  const hit = (list || []).find(s => String(s.id) === pendingFocus)
  if (!hit) return
  pendingFocus = ''
  nextTick(() => sendList.value?.focus(hit.id))
}

let seq = 0
async function loadExports() {
  const my = ++seq
  try {
    const r = await listArchives()
    if (my === seq) exportItems.value = Array.isArray(r.items) ? r.items : []
  } catch (e) {
    // 카드 사진만 "미리보기 없음"으로 보인다 — 보낸 기록·상태는 그대로
    if (my === seq) console.error('[StudioChannelSentView] 내 상품 목록 조회 실패 (미리보기 없이 표시):', e.code, e)
  }
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 미리보기 주소를 비운다 (보낸 상품은 StudioSendList가 비운다)
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    seq++
    exportItems.value = []
    pendingFocus = ''
  } else {
    loadExports()
  }
}
onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  loadExports()
})
onUnmounted(() => window.removeEventListener('euchs-auth-changed', onStudioAuthChanged))
</script>
