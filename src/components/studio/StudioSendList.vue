<template>
  <section id="sends" ref="root" class="scroll-mt-6" data-mk-sends>
    <div class="flex items-center gap-2 mb-4">
      <h2 class="st-h-section">보낸 상품</h2>
      <button type="button" class="st-btn ml-auto" :disabled="syncing || !sends.length" data-mk-sync @click="sync">{{ syncing ? '확인 중…' : '상태 새로고침' }}</button>
    </div>
    <p v-if="errorMsg" class="text-[13px] break-keep" :class="errorSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-sends-error>{{ errorMsg }}
      <router-link v-if="errorGuide" :to="{ name: 'studio-settings-marketplace' }" class="st-link ml-1">설정 &gt; 판매처 연결로 가기</router-link></p>
    <p v-else-if="!sends.length" class="st-desc break-keep" data-mk-sends-empty>아직 보낸 상품이 없어요. 위 내 상품에서 [판매처로 보내기]를 눌러 보세요.</p>
    <ul v-else class="st-card st-divide overflow-hidden">
      <li v-for="s in sends" :key="s.id" class="send-row px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0" :class="{ 'is-focus': focusId === s.id }" :data-mk-send="s.id" :data-mk-send-status="s.status">
        <span class="st-badge shrink-0" :class="SEND_STATUS_CLASS[s.status]">{{ SEND_STATUS_LABEL[s.status] || s.status }}</span>
        <span class="min-w-0 flex-1 text-[14px] font-bold st-ink truncate">{{ s.productName || '(상품명 없음)' }}</span>
        <span class="text-[12px] st-muted shrink-0">{{ fmtDate(s.createdAt) }}</span>
        <span v-if="s.sellerProductId" class="text-[12px] st-muted shrink-0 font-mono">쿠팡 #{{ s.sellerProductId }}</span>
        <span v-if="s.coupangStatus" class="text-[12px] st-muted shrink-0">쿠팡: {{ s.coupangStatus }}</span>
        <p v-if="s.reason" class="basis-full text-[12px] break-keep" :class="s.status === 'rejected' || s.status === 'failed' ? 'st-danger-text' : 'st-muted'" :data-mk-send-reason="s.id">{{ s.status === 'rejected' ? '반려 사유: ' : '' }}{{ s.reason }}</p>
      </li>
    </ul>
    <p v-if="syncErrors.length" class="mt-2 text-[12px] break-keep" :class="isNotReady(syncErrors[0].code) ? 'st-muted' : 'font-bold st-danger-text'">일부 상품은 상태를 확인하지 못했어요: {{ syncErrors[0].message }}</p>
  </section>
</template>

<script setup>
// 내 작업 화면의 [보낸 상품] — marketplace_sends. [상태 새로고침] = 서버 sync(쿠팡 상품 조회 + histories로 반려 사유)
// 목록이 바뀔 때마다 'update'로 올려 보낸다 → 내 상품 카드(StudioExportList)의 판매처 상태 배지가 같은 목록을 쓴다(따로 또 부르지 않는다)
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { listSends, syncSends, SEND_STATUS_LABEL, SEND_STATUS_CLASS, fmtDate, isNotReady, needsGuide } from '@/lib/studioMarketplace'

const emit = defineEmits(['update'])
const root = ref(null)
const sends = ref([])
const syncing = ref(false)
const errorMsg = ref('')
const errorSoft = ref(false)
const errorGuide = ref(false)
const syncErrors = ref([])
let seq = 0

function setSends(list) {
  sends.value = Array.isArray(list) ? list : []
  emit('update', sends.value)
}
function fail(where, e) {
  console.error(`[StudioSendList] ${where} 실패:`, e.code, e)
  errorMsg.value = e.message
  errorSoft.value = isNotReady(e.code)
  errorGuide.value = needsGuide(e.code) || e.code === 'not_connected'
}
async function load() {
  const my = ++seq
  errorMsg.value = ''
  try {
    const r = await listSends()
    if (my === seq) setSends(r.sends)
  } catch (e) {
    if (my === seq) fail('보낸 상품 조회', e)
  }
}
async function sync() {
  const my = ++seq
  syncing.value = true
  errorMsg.value = ''
  syncErrors.value = []
  try {
    const r = await syncSends()
    if (my !== seq) return
    setSends(r.sends)
    syncErrors.value = r.errors || []
  } catch (e) {
    if (my === seq) fail('상태 새로고침', e)
  } finally {
    syncing.value = false
  }
}
/** 내 상품 카드의 배지를 눌렀을 때 — 그 줄로 가서 잠깐 표시한다 */
const focusId = ref(null)
let focusTimer = null
async function focus(id) {
  focusId.value = id
  await nextTick()
  const row = root.value?.querySelector(`[data-mk-send="${CSS.escape(String(id))}"]`)
  ;(row || root.value)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  clearTimeout(focusTimer)
  focusTimer = setTimeout(() => { focusId.value = null }, 2400)
}
function clear() {
  clearTimeout(focusTimer)
  focusId.value = null
  seq++
  syncErrors.value = []
  errorMsg.value = ''
  setSends([])
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 보낸 상품을 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) clear()
  else load()
}
onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  load()
})
onUnmounted(() => {
  clearTimeout(focusTimer)
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
})

defineExpose({ load, clear, focus })
</script>

<style scoped>
.send-row { transition: background 0.3s; }
.send-row.is-focus { background: var(--st-accent-soft); }
</style>
