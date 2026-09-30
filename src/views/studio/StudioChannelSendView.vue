<template>
  <div class="px-4 sm:px-12 py-6 max-w-[1560px] space-y-8" data-ch-send-view>
    <!-- 로그인 전 (누구나 구경 — 2026-09-30): 판매처 목록만, 내 상품·연결 상태는 부르지 않는다 -->
    <template v-if="!loggedIn">
      <StudioLoginNeeded title="만든 상품을 판매처로 바로 보내요" desc="로그인하면 내 상품을 골라 연결한 판매처로 보낼 수 있어요." />
      <section class="st-card p-5 sm:p-6" data-ch-markets-guest>
        <h3 class="st-h-card">보낼 수 있는 판매처</h3>
        <ul class="mt-3 st-border rounded-[10px] st-divide overflow-hidden">
          <li v-for="r in guestRows" :key="r.key" class="ch-row is-off" :data-ch-market="r.key" :data-ch-market-state="r.state">
            <span class="text-[14px] font-bold truncate st-muted">{{ r.name }}</span>
            <span class="flex-1" />
            <span v-if="r.state === 'planned'" class="st-badge shrink-0" :data-ch-planned="r.key">{{ PLANNED_LABEL }}</span>
            <template v-else>
              <Lock class="w-3.5 h-3.5 st-muted shrink-0" :stroke-width="2.2" aria-label="연결 전" />
              <router-link :to="{ name: 'studio-channels-connect' }" class="st-link text-[13px] shrink-0" :data-ch-connect="r.key">연결하기</router-link>
            </template>
          </li>
        </ul>
      </section>
    </template>

    <template v-else>
    <!-- 고른 상품 + 판매처 줄 -->
    <section ref="pickedRef" class="st-card p-5 sm:p-6 scroll-mt-6" data-ch-picked>
      <template v-if="picked">
        <div class="flex items-center gap-3 min-w-0">
          <div class="ch-thumb st-border st-placeholder shrink-0">
            <img v-if="picked.previewUrl" :src="picked.previewUrl" alt="" />
          </div>
          <div class="min-w-0">
            <div class="st-desc-sm">보낼 상품</div>
            <div class="text-[15px] font-extrabold st-ink truncate" :title="picked.title || ''" data-ch-picked-title>{{ picked.title || '이름 없는 작업' }}</div>
            <div class="st-desc-sm">{{ picked.count }}장 · {{ daysAgoLabel(picked.createdAt) }}</div>
          </div>
        </div>

        <ul class="mt-4 st-border rounded-[10px] st-divide overflow-hidden" data-ch-markets>
          <li v-for="r in rows" :key="r.key" class="ch-row" :class="{ 'is-off': r.state !== 'connected' }" :data-ch-market="r.key" :data-ch-market-state="r.state">
            <span class="text-[14px] font-bold truncate" :class="r.state === 'connected' ? 'st-ink' : 'st-muted'">{{ r.name }}</span>
            <!-- 이 상품을 그 판매처로 보낸 가장 최근 상태 -->
            <button
              v-if="lastSendOf(r.key)" type="button" :class="SEND_BADGE_CLASS[lastSendOf(r.key).status] || 'st-badge'" :title="badgeReason(lastSendOf(r.key)) || undefined"
              :data-ch-market-status="r.key" @click="gotoSent(lastSendOf(r.key).id)"
            >{{ SEND_STATUS_LABEL[lastSendOf(r.key).status] || lastSendOf(r.key).status }}</button>
            <span class="flex-1" />
            <button
              v-if="r.state === 'connected'" type="button" class="st-btn st-btn-primary ch-btn" :disabled="!!opening"
              :data-ch-send="r.key" @click="openSend(r.key)"
            ><Send class="w-3.5 h-3.5" :stroke-width="2" /> {{ opening === r.key ? '여는 중…' : sendButtonLabel([r.key]) }}</button>
            <!-- 연결됨(스마트스토어·11번가) — 보내기 버튼은 아직 없다 · 아직 연결할 수 없는 곳 = "예정"만. 카페24는 연결되면 위 [카페24로 보내기] -->
            <span v-else-if="r.state === 'linked'" class="st-badge st-badge-accent shrink-0" :data-ch-linked="r.key">연결됨</span>
            <span v-else-if="r.state === 'planned'" class="st-badge shrink-0" :data-ch-planned="r.key">{{ PLANNED_LABEL }}</span>
            <!-- 연결 상태를 읽는 중·못 읽음 — 자물쇠·[연결하기]를 그리지 않는다 (studioMarketplaceRules.linkPhase) -->
            <StudioLinkPending v-else-if="rowWaiting(r)" part="badge" :phase="rowPhase(r.key)" />
            <template v-else>
              <Lock class="w-3.5 h-3.5 st-muted shrink-0" :stroke-width="2.2" aria-label="연결 전" />
              <router-link :to="{ name: 'studio-channels-connect' }" class="st-link text-[13px] shrink-0" :data-ch-connect="r.key">연결하기</router-link>
            </template>
          </li>
        </ul>
        <StudioLinkPending v-if="rowsFailed" phase="failed" @retry="retryRows" />
        <!-- 이미 읽은 뒤 다시 읽기가 실패한 때만 원인 한 줄 -->
        <p v-if="statusError && status" class="mt-2 text-[13px] break-keep" :class="statusSoft ? 'st-muted' : 'font-bold st-danger-text'" data-ch-status-error>{{ statusError }}</p>
        <p v-if="message" class="mt-2 text-[13px] font-bold break-keep" :class="messageError ? 'st-danger-text' : 'st-success-text'" data-ch-msg>{{ message }}
          <a v-if="!messageError && messageAdminUrl" :href="messageAdminUrl" target="_blank" rel="noopener" class="st-link ml-1" data-ch-admin-link>카페24 관리자에서 보기</a>
          <router-link v-if="!messageError" :to="{ name: 'studio-channels-sent' }" class="st-link ml-1">보낸 상품 보기</router-link></p>
      </template>
      <p v-else class="st-desc break-keep" data-ch-picked-empty>아래 목록에서 보낼 상품을 선택하세요.</p>
    </section>

    <!-- 내 상품 — 카드를 눌러 고른다 (판매처별 상태 배지) -->
    <StudioExportList pick :selected-id="selectedId" :sends="sends" @loaded="onLoaded" @select="select" @goto-send="gotoSent" />
    </template>

    <!-- 보내기 창 — 내 작업에 있던 것과 같은 창·같은 진입(sendToMarketplace) 그대로 -->
    <StudioSendModal :open="sendOpen" :prepare="sendPrepare" :market="sendMarket" @close="sendOpen = false" @sent="onSent" />
  </div>
</template>

<script setup>
// 판매처 > [보내기] 탭 (2026-09-30) — 내 상품을 하나 고르고, 판매처 줄에서 보낸다.
//   연결된 판매처 = [쿠팡으로 보내기]·[카페24로 보내기](2026-09-30) → 같은 보내기 창(StudioSendModal · 진입은 studioMarketplace.sendToMarketplace 한 곳) — 누른 판매처만 처음 체크(market prop)
//   연결 전 판매처 = 자물쇠 + [연결하기](연결 탭) · 아직 연결할 수 없는 곳 = "예정" 한 단어만. "준비 중" 글자는 쓰지 않는다 (줄 규칙 studioMarketplaceRules.channelRows)
// 주소 ?export=<내 상품 id> = 그 상품을 골라 둔 채로 연다 (편집기 [작업 저장] 뒤 [판매처로 보내기] · 내 작업 "판매처에서 보내기 →")
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Send, Lock } from 'lucide-vue-next'
import StudioExportList from '@/components/studio/StudioExportList.vue'
import StudioSendModal from '@/components/studio/StudioSendModal.vue'
import StudioLoginNeeded from '@/components/studio/StudioLoginNeeded.vue'
import StudioLinkPending from '@/components/studio/StudioLinkPending.vue'
import { currentUser, isSuperAdmin, isAuthLoading } from '@/lib/auth'
import { studioGate } from '@/lib/studioGate'
import { getMarketplaceStatus, listSends, sendToMarketplace, sendsByExport, badgeReason, isNotReady, SEND_STATUS_LABEL, SEND_BADGE_CLASS } from '@/lib/studioMarketplace'
import { channelRows, sendButtonLabel, MARKETS, PLANNED_LABEL, linkPhase } from '@/lib/studioMarketplaceRules'
import { linkStates, loadMarketLinks, marketLinksPhase } from '@/lib/studioMarketLinks'
import { daysAgoLabel } from '@/lib/studioProjectList'

const route = useRoute()
const router = useRouter()
const loggedIn = computed(() => !!currentUser.value?.id)
const guestRows = channelRows({}) // 로그인 전 — 연결할 수 있는 곳은 자물쇠 + [연결하기], 나머지는 "예정"

const items = ref([])       // 내 상품 (StudioExportList가 읽은 것)
const selectedId = ref(typeof route.query.export === 'string' ? route.query.export : '')
const picked = computed(() => items.value.find(x => x.id === selectedId.value) || null)
const pickedRef = ref(null)

// ── 연결 상태 → 판매처 줄 ──
const status = ref(null)
const statusError = ref('')
const statusSoft = ref(false)
const rows = computed(() => channelRows(linkStates(status.value?.connected === true), { admin: isSuperAdmin.value })) // 쿠팡 + 11번가·스마트스토어·카페24(studioMarketLinks) — 카페24는 심사 승인 전 관리자만
// 줄마다 표시 단계 — 쿠팡 = 이 화면이 읽는 status, 11번가·스마트스토어·카페24 = studioMarketLinks.
// 읽기 전에는 "연결 전"(자물쇠·[연결하기]) 대신 자리표시, 처음부터 못 읽으면 목록 아래 "불러오지 못했습니다 [다시 시도]"
const coupangPhase = computed(() => linkPhase({ authLoading: isAuthLoading.value, loggedIn: loggedIn.value, loaded: !!status.value, error: statusError.value }))
const rowPhase = key => (key === 'coupang' ? coupangPhase.value : marketLinksPhase.value)
const rowWaiting = r => r.state === 'locked' && ['checking', 'failed'].includes(rowPhase(r.key))
const rowsFailed = computed(() => rows.value.some(r => r.state === 'locked' && rowPhase(r.key) === 'failed'))
function retryRows() {
  if (coupangPhase.value === 'failed') loadStatus()
  if (marketLinksPhase.value === 'failed') loadMarketLinks()
}
async function loadStatus() {
  statusError.value = ''
  try {
    status.value = await getMarketplaceStatus()
  } catch (e) {
    console.error('[StudioChannelSendView] 연결 상태 조회 실패:', e.code, e)
    statusError.value = e.message
    statusSoft.value = isNotReady(e.code)
  }
}

// ── 보낸 기록 (배지) ──
const sends = ref([])
let sendsSeq = 0
async function loadSends() {
  const my = ++sendsSeq
  try {
    const r = await listSends()
    if (my === sendsSeq) sends.value = Array.isArray(r.sends) ? r.sends : []
  } catch (e) {
    // 배지만 빠진다 — 보내기는 그대로 쓸 수 있다 (자세한 오류는 [보낸 상품] 탭에서)
    if (my === sendsSeq) console.error('[StudioChannelSendView] 보낸 상품 조회 실패 (배지 없이 표시):', e.code, e)
  }
}
const lastOf = computed(() => (picked.value ? sendsByExport(sends.value)[picked.value.id] || [] : []))
const lastSendOf = key => lastOf.value.find(s => s.market === key) || null

// ── 고르기 ──
let scrolled = false
function onLoaded(list) {
  items.value = Array.isArray(list) ? list : []
  if (selectedId.value && !picked.value && items.value.length) {
    console.warn('[StudioChannelSendView] 주소의 내 상품이 목록에 없음 — 고르지 않은 채로 둔다:', selectedId.value)
    selectedId.value = ''
  }
  if (picked.value && !scrolled) {
    scrolled = true
    nextTick(() => pickedRef.value?.scrollIntoView({ block: 'start' }))
  }
}
function select(x) {
  if (!x?.id) return
  selectedId.value = x.id
  message.value = ''
  router.replace({ query: { ...route.query, export: x.id } }) // 새로고침해도 같은 상품
  nextTick(() => pickedRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
function gotoSent(id) {
  router.push({ name: 'studio-channels-sent', query: { focus: String(id) } })
}

// ── 보내기 (예전 내 상품 카드의 [판매처로 보내기]와 같은 길) ──
const opening = ref('')
const sendOpen = ref(false)
const sendPrepare = ref(null)
const sendMarket = ref('') // 누른 버튼의 판매처 — 창이 그곳만 처음 체크한다
const message = ref('')
const messageError = ref(false)
const messageAdminUrl = ref('') // 카페24 등록 뒤 [카페24 쇼핑몰 관리 화면에서 보기]
async function openSend(market) {
  if (!picked.value || opening.value) return
  opening.value = market
  message.value = ''
  messageAdminUrl.value = ''
  try {
    // 작업 시작 관문 — 주문 이력이 없으면 안내 창 (서버 API도 같은 자격을 다시 확인한다)
    if (!(await studioGate(`/studio/channels/send?export=${encodeURIComponent(picked.value.id)}`))) return
    const r = await sendToMarketplace(picked.value.id)
    sendPrepare.value = r.prepare
    sendMarket.value = market
    sendOpen.value = true
  } catch (e) {
    console.error('[StudioChannelSendView] 판매처로 보내기 준비 실패:', picked.value.id, e.code, e)
    message.value = e.message
    messageError.value = true
  } finally {
    opening.value = ''
  }
}
function onSent(r) {
  const market = r?.market || 'coupang'
  const name = MARKETS.find(m => m.key === market)?.name || market
  // 카페24 = 승인 절차 없이 등록 → "등록되었습니다" + 진열상태 + 관리자 링크. 쿠팡 = 승인 요청 → "전송되었습니다" (문구 원칙: 결과는 ~되었습니다)
  message.value = market === 'cafe24'
    ? `카페24에 등록되었습니다.${r?.productNo ? ` 상품번호 ${r.productNo}` : ''} · ${r?.display === 'T' ? '진열함' : '진열안함'}${typeof r?.repImageError === 'string' && r.repImageError ? ` — ${r.repImageError}` : ''}`
    : `${name}에 전송되었습니다.${r?.sellerProductId ? ` 상품번호 ${r.sellerProductId}` : ''}`
  messageAdminUrl.value = market === 'cafe24' && typeof r?.adminUrl === 'string' ? r.adminUrl : ''
  messageError.value = false
  loadSends()
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 연결 상태·보낸 기록·고른 상품을 비운다 (내 상품 목록은 StudioExportList가 비운다)
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    sendsSeq++
    status.value = null
    statusError.value = ''
    sends.value = []
    selectedId.value = ''
    sendOpen.value = false
    sendPrepare.value = null
    sendMarket.value = ''
    message.value = ''
    messageAdminUrl.value = ''
  } else {
    loadStatus()
    loadSends()
  }
}
onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  loadMarketLinks() // 11번가·스마트스토어·카페24 연결 상태 (로그인 전이면 부르지 않는다)
  if (!loggedIn.value) return // 로그인 전에는 부르지 않는다 (로그인하면 euchs-auth-changed로 읽는다)
  loadStatus()
  loadSends()
})
onUnmounted(() => window.removeEventListener('euchs-auth-changed', onStudioAuthChanged))
</script>

<style scoped>
.ch-thumb { width: 64px; height: 64px; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.ch-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ch-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--st-surface); min-height: 52px; }
.ch-row.is-off { background: var(--st-soft); }
.ch-btn { height: 32px; padding: 0 12px; font-size: 13px; gap: 5px; white-space: nowrap; }
</style>
