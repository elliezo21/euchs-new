<template>
  <section id="sends" ref="root" class="scroll-mt-6" data-mk-sends>
    <div class="flex items-center gap-2 mb-4">
      <h2 class="st-h-section">보낸 상품</h2>
      <button type="button" class="st-btn ml-auto" :disabled="syncing || !sends.length" data-mk-sync @click="sync">{{ syncing ? '확인 중…' : '상태 새로고침' }}</button>
    </div>
    <p v-if="errorMsg" class="text-[13px] break-keep" :class="errorSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-sends-error>{{ errorMsg }}
      <router-link v-if="errorGuide" :to="{ name: 'studio-channels-connect' }" class="st-link ml-1">[연결] 탭으로 가기</router-link></p>
    <p v-else-if="!sends.length" class="st-desc break-keep" data-mk-sends-empty>보낸 상품이 없습니다. [보내기] 탭에서 상품을 선택하세요.</p>
    <template v-else>
    <!-- 판매처별로 보기 — 보낸 적 있는 판매처만 (MARKETS 순서) -->
    <div class="flex flex-wrap gap-1 mb-3" data-mk-sends-markets>
      <button type="button" class="st-chip" :class="!marketFilter ? 'is-active' : ''" data-mk-sends-market="" @click="marketFilter = ''">전체 {{ sends.length }}</button>
      <button v-for="m in sentMarkets" :key="m.key" type="button" class="st-chip" :class="marketFilter === m.key ? 'is-active' : ''" :data-mk-sends-market="m.key" @click="marketFilter = m.key">{{ m.name }} {{ m.count }}</button>
    </div>
    <!-- 작은 카드 — 내 작업·내 상품과 같은 크기 (st-grid-compact). 사진 = 그 내 상품의 미리보기 -->
    <ul class="st-grid-compact" data-mk-sends-grid>
      <li v-for="s in shownSends" :key="s.id" class="send-row min-w-0 rounded-[10px]" :class="{ 'is-focus': focusId === s.id }" :data-mk-send="s.id" :data-mk-send-status="s.status">
        <div class="relative st-thumb-sq st-border st-placeholder">
          <img v-if="previewOf[s.exportId]" :src="previewOf[s.exportId]" alt="" loading="lazy" />
          <span v-else class="text-[11px]">미리보기 없음</span>
          <span class="st-badge absolute left-1.5 top-1.5" :class="SEND_STATUS_CLASS[s.status]" :title="badgeReason(s) || undefined">{{ marketName(s.market) }} · {{ sendStatusLabel(s.status) }}</span>
        </div>
        <div class="mt-1.5 text-[13px] font-bold st-ink truncate" :title="s.productName || ''">{{ s.productName || '(상품명 없음)' }}</div>
        <div class="st-desc-sm truncate" :title="fmtDate(s.createdAt)">{{ daysAgoLabel(s.createdAt) }}<template v-if="s.sellerProductId"> · #{{ s.sellerProductId }}</template></div>
        <div v-if="s.coupangStatus" class="st-desc-sm truncate">{{ marketName(s.market) }}: {{ s.coupangStatus }}</div>
        <div v-if="s.revision" class="st-desc-sm truncate" :data-mk-send-revision="s.id">다시 보낸 횟수 {{ s.revision }}</div>
        <p v-if="s.reason" class="text-[12px] break-keep send-reason" :class="s.status === 'rejected' || s.status === 'failed' ? 'st-danger-text' : 'st-muted'" :title="s.reason" :data-mk-send-reason="s.id">{{ s.status === 'rejected' ? '반려 사유: ' : '' }}{{ s.reason }}</p>
        <!-- 카페24 = 등록됨 → 진열상태(보낸 값) + 관리자 링크 (2026-09-30) -->
        <template v-if="s.market === 'cafe24' && s.status === 'registered'">
          <p class="st-desc-sm break-keep" :data-mk-send-display="s.id">진열상태: {{ s.display === 'T' ? '진열함' : '진열안함' }}</p>
          <a v-if="s.adminUrl" :href="s.adminUrl" target="_blank" rel="noopener" class="st-btn mt-1.5 w-full text-[12px] whitespace-normal text-center" :data-mk-send-admin="s.id">카페24 관리자에서 보기</a>
        </template>
        <!-- 스마트스토어 = 등록됨 → 보낸 전시상태 + 채널상품번호 (2026-10-01) -->
        <template v-if="s.market === 'smartstore' && s.status === 'registered'">
          <p class="st-desc-sm break-keep" :data-mk-send-ss-display="s.id">전시상태: {{ s.ssDisplay === 'ON' ? '전시중' : '전시중지' }}<template v-if="s.channelProductNo"> · 채널상품번호 {{ s.channelProductNo }}</template></p>
        </template>
        <button v-if="canResend(s)" type="button" class="st-btn st-btn-primary mt-1.5 w-full" :disabled="resendBusy === s.id" :data-mk-send-resend="s.id" @click="openResend(s)">{{ resendBusy === s.id ? '여는 중…' : '수정 후 다시 보내기' }}</button>
      </li>
    </ul>
    </template>
    <StudioSendModal :open="resendOpen" :prepare="resendPrepare" :load-error="resendError" @close="resendOpen = false" @sent="onResent" @retry="loadResend(resendId)" />
    <p v-if="syncErrors.length" class="mt-2 text-[12px] break-keep" :class="isNotReady(syncErrors[0].code) ? 'st-muted' : 'font-bold st-danger-text'">일부 상품의 상태를 확인하지 못했습니다: {{ syncErrors[0].message }}</p>
  </section>
</template>

<script setup>
// 판매처 > [보낸 상품] 탭 (2026-09-30 내 작업 화면에서 옮김) — marketplace_sends. [상태 새로고침] = 서버 sync(쿠팡 상품 조회 + histories로 반려 사유)
// 목록이 바뀔 때마다 'update'로 올려 보낸다. 판매처 칩 = 판매처별로 거르기(화면에서만 — 목록은 그대로 한 번 읽는다)
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import StudioSendModal from '@/components/studio/StudioSendModal.vue'
import { canResend } from '@/lib/studioMarketplaceRules'
import { resendToMarketplace, listSends, syncSends, sendStatusLabel, SEND_STATUS_CLASS, fmtDate, isNotReady, needsGuide, badgeReason } from '@/lib/studioMarketplace'
import { MARKETS } from '@/lib/studioMarketplaceRules'
import { daysAgoLabel } from '@/lib/studioProjectList'

const props = defineProps({ exports: { type: Array, default: () => [] } }) // 내 상품 목록 (StudioExportList가 읽은 것 — 미리보기 사진)
const emit = defineEmits(['update'])
const previewOf = computed(() => Object.fromEntries((props.exports || []).filter(x => x && x.previewUrl).map(x => [x.id, x.previewUrl])))
const marketName = key => MARKETS.find(m => m.key === key)?.name || key
const root = ref(null)
const sends = ref([])
const syncing = ref(false)
const errorMsg = ref('')
const errorSoft = ref(false)
const errorGuide = ref(false)
const syncErrors = ref([])
let seq = 0

// 판매처별 보기 — 예전 기록에는 판매처 칸이 없었다(그때는 쿠팡뿐 — sendsByExport와 같은 규칙)
const marketOf = s => s.market || 'coupang'
const marketFilter = ref('')
const sentMarkets = computed(() => MARKETS.map(m => ({ ...m, count: sends.value.filter(s => marketOf(s) === m.key).length })).filter(m => m.count > 0))
const shownSends = computed(() => (marketFilter.value ? sends.value.filter(s => marketOf(s) === marketFilter.value) : sends.value))

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
// 반려된 상품 [고쳐서 다시 보내기] — 그 전송의 값으로 채운 보내기 창을 연다. 보내면 새 상품을 만들지 않고 같은 쿠팡 상품을 고쳐 다시 승인 요청한다
// 창을 먼저 열고 준비 데이터(send_prepare)는 창 안에서 기다린다 — 못 받으면 창 안에 이유 + [다시 시도] (2026-09-30)
const resendOpen = ref(false)
const resendPrepare = ref(null)
const resendBusy = ref(null)
const resendError = ref('')
const resendId = ref(null)
let resendSeq = 0
async function loadResend(id) {
  const my = ++resendSeq
  resendBusy.value = id
  resendError.value = ''
  try {
    const r = await resendToMarketplace(id)
    if (my === resendSeq) resendPrepare.value = r.prepare
  } catch (e) {
    console.error('[StudioSendList] 다시 보내기 준비 실패:', e.code, e)
    if (my === resendSeq) resendError.value = e.message
  } finally {
    if (my === resendSeq) resendBusy.value = null
  }
}
function openResend(s) {
  resendId.value = s.id
  resendPrepare.value = null
  resendOpen.value = true
  loadResend(s.id)
}
function onResent() { load() }

/** 내 상품 카드의 배지를 눌렀을 때 — 그 줄로 가서 잠깐 표시한다 */
const focusId = ref(null)
let focusTimer = null
async function focus(id) {
  const hit = sends.value.find(s => s.id === id)
  if (hit && marketFilter.value && marketOf(hit) !== marketFilter.value) marketFilter.value = '' // 거른 목록에 없으면 전체로
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
  resendOpen.value = false
  resendPrepare.value = null
  resendError.value = ''
  resendSeq++
  resendBusy.value = null
  resendId.value = null
  marketFilter.value = ''
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
.send-row { transition: background 0.3s, box-shadow 0.3s; }
.send-row.is-focus { background: var(--st-accent-soft); box-shadow: 0 0 0 4px var(--st-accent-soft); }
.send-reason { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
