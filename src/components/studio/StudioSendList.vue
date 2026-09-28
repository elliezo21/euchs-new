<template>
  <section class="st-card p-5 sm:p-6" data-mk-sends>
    <div class="flex items-center gap-2 mb-3">
      <h3 class="st-h-card">처리현황</h3>
      <button type="button" class="st-btn ml-auto" :disabled="syncing || !sends.length" data-mk-sync @click="sync">{{ syncing ? '확인 중…' : '상태 새로고침' }}</button>
    </div>
    <p v-if="errorMsg" class="text-[13px] font-bold st-danger-text break-keep" data-mk-sends-error>{{ errorMsg }}</p>
    <p v-else-if="!sends.length" class="st-desc break-keep" data-mk-sends-empty>아직 보낸 상품이 없어요. 내 작업 → 완성작에서 [판매처로 보내기]를 눌러 보세요.</p>
    <ul v-else class="st-divide st-border rounded-[12px] overflow-hidden">
      <li v-for="s in sends" :key="s.id" class="px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0" :data-mk-send="s.id" :data-mk-send-status="s.status">
        <span class="st-badge shrink-0" :class="SEND_STATUS_CLASS[s.status]">{{ SEND_STATUS_LABEL[s.status] || s.status }}</span>
        <span class="min-w-0 flex-1 text-[14px] font-bold st-ink truncate">{{ s.productName || '(상품명 없음)' }}</span>
        <span class="text-[12px] st-muted shrink-0">{{ fmtDate(s.createdAt) }}</span>
        <span v-if="s.sellerProductId" class="text-[12px] st-muted shrink-0 font-mono">쿠팡 #{{ s.sellerProductId }}</span>
        <span v-if="s.coupangStatus" class="text-[12px] st-muted shrink-0">쿠팡: {{ s.coupangStatus }}</span>
        <p v-if="s.reason" class="basis-full text-[12px] break-keep" :class="s.status === 'rejected' || s.status === 'failed' ? 'st-danger-text' : 'st-muted'" :data-mk-send-reason="s.id">{{ s.status === 'rejected' ? '반려 사유: ' : '' }}{{ s.reason }}</p>
      </li>
    </ul>
    <p v-if="syncErrors.length" class="mt-2 text-[12px] font-bold st-danger-text break-keep">일부 확인 실패: {{ syncErrors[0].message }}</p>
  </section>
</template>

<script setup>
// 처리현황 — marketplace_sends. [상태 새로고침] = 서버 sync(쿠팡 상품 조회 + histories로 반려 사유)
import { ref } from 'vue'
import { listSends, syncSends, SEND_STATUS_LABEL, SEND_STATUS_CLASS, fmtDate } from '@/lib/studioMarketplace'

const sends = ref([])
const syncing = ref(false)
const errorMsg = ref('')
const syncErrors = ref([])

async function load() {
  errorMsg.value = ''
  try { sends.value = (await listSends()).sends } catch (e) {
    console.error('[StudioSendList] 처리현황 조회 실패:', e.code, e)
    errorMsg.value = e.message
  }
}
async function sync() {
  syncing.value = true
  errorMsg.value = ''
  syncErrors.value = []
  try {
    const r = await syncSends()
    sends.value = r.sends
    syncErrors.value = r.errors || []
  } catch (e) {
    console.error('[StudioSendList] 상태 새로고침 실패:', e.code, e)
    errorMsg.value = e.message
  } finally {
    syncing.value = false
  }
}
function clear() { sends.value = []; syncErrors.value = []; errorMsg.value = '' }
defineExpose({ load, clear })
</script>
