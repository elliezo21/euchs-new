<template>
  <div class="px-4 sm:px-12 py-6 max-w-5xl space-y-6" data-mk-view>
    <p class="st-desc break-keep">완성한 상세페이지를 판매처에 바로 올려요. 가이드를 보고 직접 연결할 수 있어요.</p>

    <p v-if="loadError" class="text-[14px] break-keep" :class="loadSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-load-error>{{ loadError }}</p>

    <!-- 연결 카드 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section class="st-card p-5 sm:p-6" data-mk-card="coupang">
        <div class="flex items-center gap-2">
          <span class="st-icon-box"><Store class="w-[18px] h-[18px]" :stroke-width="2" /></span>
          <h3 class="st-h-card">쿠팡</h3>
          <span v-if="st?.connected" class="st-badge ml-auto" :class="st.account.status === 'connected' ? 'st-badge-accent' : 'st-badge-danger'" data-mk-status-badge>{{ STATUS_LABEL[st.account.status] }}</span>
          <span v-else class="st-badge ml-auto">연결 전</span>
        </div>

        <!-- 연결됨 -->
        <div v-if="st?.connected" class="mt-4 space-y-2 text-[13px]" data-mk-connected>
          <div class="grid grid-cols-[92px_1fr] gap-y-1.5">
            <span class="st-muted">Wing ID</span><span class="st-ink font-bold">{{ st.account.seller_login_id }}</span>
            <span class="st-muted">업체코드</span><span class="st-ink font-mono">{{ st.account.vendor_id }}</span>
            <span class="st-muted">Access Key</span><span class="st-ink font-mono">•••• {{ st.account.key_last4 }}</span>
            <span class="st-muted">만료일</span>
            <span :class="expiry.level === 'ok' ? 'st-ink' : 'st-danger-text font-bold'" data-mk-expiry>{{ fmtDate(st.account.expires_at).slice(0, 10) }} · {{ expiry.label }}</span>
            <span class="st-muted">마지막 확인</span><span class="st-ink">{{ fmtDate(st.account.last_checked_at) }}</span>
          </div>
          <p v-if="expiry.level !== 'ok'" class="text-[12px] font-bold st-danger-text break-keep">Wing에서 키를 재발급한 뒤 [키 교체]로 새 키를 넣어 주세요.</p>
          <p v-if="st.account.last_error" class="text-[12px] st-danger-text break-keep">마지막 확인 결과: {{ st.account.last_error }}
            <button type="button" class="st-link ml-1" @click="guideOpen = true">연결 방법 보기</button></p>
          <div class="flex flex-wrap gap-2 pt-1">
            <button type="button" class="st-btn" :disabled="!!busy" data-mk-refresh @click="doRefresh">{{ busy === 'refresh' ? '확인 중…' : '출고지·반품지 새로고침' }}</button>
            <button type="button" class="st-btn" :disabled="!!busy" data-mk-rekey @click="openForm(true)">키 교체</button>
            <button type="button" class="st-btn st-btn-danger" :disabled="!!busy" data-mk-disconnect @click="confirmDisconnect = true">연결 해제</button>
          </div>
        </div>

        <!-- 연결 전 (상태를 못 읽었을 때도 버튼은 평소처럼 — 누르면 그때 안내) -->
        <div v-else-if="st || loadError || !loggedIn" class="mt-4 space-y-3">
          <p class="st-desc break-keep">쿠팡 Wing에서 OPEN API 키를 발급받아 넣으면 내 상품을 쿠팡 상품으로 바로 보낼 수 있어요.</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="st-btn st-btn-primary" :disabled="gating" data-mk-connect-open @click="startConnect">쿠팡 연결하기</button>
            <button type="button" class="st-btn" data-mk-guide-open @click="guideOpen = true">연결 방법 보기</button>
          </div>
        </div>
        <p v-else class="mt-4 st-desc">불러오는 중…</p>
        <p v-if="actionMsg" class="mt-3 text-[13px] break-keep" :class="TONE_CLASS[actionTone]" data-mk-action-msg>{{ actionMsg }}
          <button v-if="actionGuide" type="button" class="st-link ml-1" data-mk-action-guide @click="guideOpen = true">연결 방법 보기</button></p>
      </section>

      <!-- 11번가 — 쿠팡과 같은 키 연결 (2026-09-30, 연결까지만) -->
      <StudioElevenstCard />
      <!-- 스마트스토어 — 11번가와 같은 키 연결 (2026-09-30 S3-2, 연결까지만) -->
      <StudioSmartstoreCard />
    </div>
    <p v-if="marketLinks.error" class="text-[13px] break-keep" :class="marketLinks.soft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-links-error>{{ marketLinks.error }}</p>

    <!-- 다른 판매처 — [연결 신청] (예전 "준비 중" 목록) -->
    <StudioMarketRequests />

    <!-- 출고지·반품지 -->
    <section v-if="st?.connected" class="st-card p-5 sm:p-6" data-mk-places>
      <div class="flex items-center gap-2 mb-3">
        <h3 class="st-h-card">출고지 · 반품지</h3>
        <button type="button" class="st-link-muted ml-auto text-[13px]" @click="guideOpen = true">연결 방법 다시 보기</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
        <div v-for="kind in ['outbound', 'return']" :key="kind">
          <div class="st-label">{{ kind === 'outbound' ? '출고지' : '반품지' }} ({{ placesOf(kind).length }})</div>
          <p v-if="!placesOf(kind).length" class="st-desc break-keep">아직 없어요. Wing에서 등록한 뒤 [출고지·반품지 새로고침]을 눌러 주세요.</p>
          <ul v-else class="space-y-1.5">
            <li v-for="p in placesOf(kind)" :key="p.id" class="st-surface st-border rounded-[10px] px-3 py-2" :data-mk-place="p.place_code">
              <div class="font-bold st-ink">{{ p.name }} <span class="st-muted font-normal">#{{ p.place_code }}</span><span v-if="!p.usable" class="st-badge st-badge-danger ml-1">사용 불가</span></div>
              <div class="st-desc-sm break-keep">{{ [p.address?.zip, p.address?.address, p.address?.addressDetail].filter(Boolean).join(' ') || '주소 없음' }}<span v-if="p.address?.deliverName"> · {{ p.address.deliverName }}</span></div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <p v-if="st?.connected" class="st-desc break-keep" data-mk-next>다음 단계: <router-link :to="{ name: 'studio-channels-defaults' }" class="st-link">[기본 설정]</router-link>에서 배송·반품 템플릿을 만들어 두면 <router-link :to="{ name: 'studio-channels-send' }" class="st-link">[보내기]</router-link>에서 내 상품을 보낼 수 있어요.</p>

    <!-- 연결·키 교체 창 -->
    <StudioModal :open="formOpen" :title="rekey ? '쿠팡 키 교체' : '쿠팡 연결'" wide @close="formOpen = false">
      <form class="space-y-3" data-mk-connect-form @submit.prevent="doConnect">
        <p class="st-desc break-keep">Wing → 판매자정보 → 추가판매정보 → OPEN API 키에서 복사한 값을 넣어 주세요. 키는 안전하게 보관하고 화면에 다시 보여 주지 않아요.
          <button type="button" class="st-link ml-1" @click="guideOpen = true">연결 방법 보기</button></p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block"><span class="st-label">Wing 로그인 ID *</span><input v-model.trim="form.seller_login_id" class="st-input w-full" maxlength="100" required data-mk-f-login /></label>
          <label class="block"><span class="st-label">업체코드 (Vendor ID) *</span><input v-model.trim="form.vendor_id" class="st-input w-full font-mono" maxlength="20" placeholder="A00012345" required data-mk-f-vendor /></label>
          <label class="block"><span class="st-label">Access Key *</span><input v-model.trim="form.access_key" class="st-input w-full font-mono" maxlength="200" autocomplete="off" required data-mk-f-ak /></label>
          <label class="block"><span class="st-label">Secret Key *</span><input v-model.trim="form.secret_key" type="password" class="st-input w-full font-mono" maxlength="200" autocomplete="new-password" required data-mk-f-sk /></label>
          <label class="block"><span class="st-label">키 유효기간(만료일) *</span><input v-model="form.expires_at" type="date" class="st-input w-full" required data-mk-f-exp /></label>
        </div>
        <p class="st-desc-sm break-keep">저장 전에 출고지·반품지 조회로 키를 확인해요. Wing에 IP {{ st?.relayIp || '3.39.196.112' }}가 등록돼 있어야 해요(반영 최대 30분).</p>
        <p v-if="formError" class="text-[13px] break-keep" :class="TONE_CLASS[formTone]" data-mk-connect-error>{{ formError }}
          <button v-if="formGuide" type="button" class="st-link ml-1" data-mk-connect-guide @click="guideOpen = true">연결 방법 보기</button></p>
        <div class="flex justify-end gap-2">
          <button type="button" class="st-btn" @click="formOpen = false">취소</button>
          <button type="submit" class="st-btn st-btn-primary" :disabled="busy === 'connect'" data-mk-connect-submit>{{ busy === 'connect' ? '확인 중…' : '키 확인하고 연결' }}</button>
        </div>
      </form>
    </StudioModal>

    <StudioModal :open="confirmDisconnect" title="쿠팡 연결을 해제할까요?" @close="confirmDisconnect = false">
      저장된 키·출고지·템플릿을 지워요. 보낸 상품 기록은 남아요.
      <template #actions>
        <button type="button" class="st-btn" @click="confirmDisconnect = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" data-mk-disconnect-confirm @click="doDisconnect">해제</button>
      </template>
    </StudioModal>

    <StudioMarketplaceGuide :open="guideOpen" :relay-ip="st?.relayIp || '3.39.196.112'" @close="guideOpen = false" />
  </div>
</template>

<script setup>
// 판매처 > [연결] 탭 (스튜디오 → 쿠팡 2~3단계, 2026-09-28 · 2026-09-30 설정에서 옮김). 서버 api/marketplace.js — 브라우저는 키를 한 번 보내고 다시 보지 않는다.
// 배송·반품 템플릿은 [기본 설정] 탭(StudioShippingView), 보낸 상품은 [보낸 상품] 탭(StudioSendList)에 있다.
// 우리 쪽 준비 문제(isNotReady)는 회색 한 줄로만 보인다 — 빨간 경고·내부 원인 문구 없음(원인은 서버 로그).
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Store } from 'lucide-vue-next'
import { currentUser } from '@/lib/auth'
import { studioGate } from '@/lib/studioGate'
import StudioModal from '@/components/studio/StudioModal.vue'
import StudioMarketplaceGuide from '@/components/studio/StudioMarketplaceGuide.vue'
import { getMarketplaceStatus, connectCoupang, disconnectCoupang, refreshPlaces, expiryState, fmtDate, isNotReady, needsGuide } from '@/lib/studioMarketplace'
import StudioElevenstCard from '@/components/studio/StudioElevenstCard.vue'
import StudioSmartstoreCard from '@/components/studio/StudioSmartstoreCard.vue'
import StudioMarketRequests from '@/components/studio/StudioMarketRequests.vue'
import { marketLinks, loadMarketLinks } from '@/lib/studioMarketLinks'

const STATUS_LABEL = { connected: '연결됨', invalid: '키 확인 필요', expired: '만료됨' }
// 쿠팡 밖의 판매처 — 11번가(키 연결)는 StudioElevenstCard, 나머지(MARKETS connect 'request')는 StudioMarketRequests. 상태는 studioMarketLinks 한 곳
const TONE_CLASS = { ok: 'font-bold st-success-text', error: 'font-bold st-danger-text', soft: 'st-muted' }
const toneOf = e => isNotReady(e.code) ? 'soft' : 'error'

const route = useRoute()
const router = useRouter()
const loggedIn = computed(() => !!currentUser.value?.id)
const st = ref(null)
const loadError = ref('')
const loadSoft = ref(false)
const busy = ref('')
const actionMsg = ref('')
const actionTone = ref('ok')
const actionGuide = ref(false)
const guideOpen = ref(false)
const formOpen = ref(false)
const rekey = ref(false)
const formError = ref('')
const formTone = ref('error')
const formGuide = ref(false)
const confirmDisconnect = ref(false)
const form = ref({ seller_login_id: '', vendor_id: '', access_key: '', secret_key: '', expires_at: '' })

const expiry = computed(() => st.value?.connected ? expiryState(st.value.account.expires_at) : { level: 'ok', label: '' })
const placesOf = kind => (st.value?.places || []).filter(p => p.kind === kind)

async function load() {
  loadError.value = ''
  try {
    st.value = await getMarketplaceStatus()
  } catch (e) {
    console.error('[StudioMarketplaceView] 상태 조회 실패:', e.code, e)
    loadError.value = e.message
    loadSoft.value = isNotReady(e.code)
  }
}
function defaultExpiry() {
  const d = new Date(Date.now() + 180 * 86400000 + 9 * 3600000)
  return d.toISOString().slice(0, 10)
}
function openForm(isRekey) {
  rekey.value = isRekey
  form.value = { seller_login_id: st.value?.account?.seller_login_id || '', vendor_id: st.value?.account?.vendor_id || '', access_key: '', secret_key: '', expires_at: defaultExpiry() }
  formError.value = ''
  formGuide.value = false
  formOpen.value = true
}
// [쿠팡 연결하기] — 누구나 보는 화면이라(2026-09-30) 연결을 시작할 때만 관문(studioGate).
// 로그인 전 → 로그인 창, 로그인하면 ?connect=1로 돌아와 연결 창을 이어서 연다 · 주문 이력 없음 → 안내 창
const gating = ref(false)
async function startConnect() {
  if (gating.value) return
  gating.value = true
  try {
    if (await studioGate('/studio/channels/connect?connect=1')) openForm(false)
  } finally {
    gating.value = false
  }
}
// 로그인 뒤 이어서 — ?connect=1이면 상태를 읽은 뒤(연결 전일 때만) 연결 창 (한 번 쓰고 주소에서 뗀다)
async function resumeConnect() {
  if (route.query.connect !== '1' || !loggedIn.value) return
  const { connect, ...rest } = route.query
  router.replace({ query: rest })
  await load()
  if (!st.value?.connected && !loadError.value) startConnect()
}

function note(msg, tone = 'ok', guide = false) {
  actionMsg.value = msg
  actionTone.value = tone
  actionGuide.value = guide
}
const noteError = e => note(e.message, toneOf(e), needsGuide(e.code))

async function doConnect() {
  busy.value = 'connect'
  formError.value = ''
  formGuide.value = false
  try {
    st.value = await connectCoupang(form.value)
    loadError.value = ''
    form.value.access_key = ''
    form.value.secret_key = ''
    formOpen.value = false
    note(`쿠팡이 연결됐어요. 출고지 ${placesOf('outbound').length}곳 · 반품지 ${placesOf('return').length}곳을 불러왔어요.`)
  } catch (e) {
    console.error('[StudioMarketplaceView] 연결 실패:', e.code, e)
    formError.value = e.message
    formTone.value = toneOf(e)
    formGuide.value = needsGuide(e.code)
  } finally {
    busy.value = ''
  }
}
async function doRefresh() {
  busy.value = 'refresh'
  try {
    st.value = await refreshPlaces()
    note('출고지·반품지를 다시 불러왔어요.')
  } catch (e) {
    console.error('[StudioMarketplaceView] 출고지 새로고침 실패:', e.code, e)
    noteError(e)
    if (['bad_key', 'ip_not_allowed', 'bad_vendor'].includes(e.code)) load()
  } finally {
    busy.value = ''
  }
}
async function doDisconnect() {
  confirmDisconnect.value = false
  busy.value = 'disconnect'
  try {
    await disconnectCoupang()
    note('쿠팡 연결을 해제했어요.')
    await load()
  } catch (e) {
    console.error('[StudioMarketplaceView] 연결 해제 실패:', e.code, e)
    noteError(e)
  } finally {
    busy.value = ''
  }
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 연결 상태를 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    st.value = null
    formOpen.value = false
    confirmDisconnect.value = false
    actionMsg.value = ''
    loadError.value = ''
  } else if (route.query.connect !== '1') { // ?connect=1이면 아래 watch가 읽고 이어서 연다
    load()
  }
}
// 이메일 로그인은 같은 화면에 ?connect=1만 붙여 돌아온다(onMounted가 다시 돌지 않음) → 주소·로그인 상태를 지켜본다
watch(() => [route.query.connect, loggedIn.value], ([c, ok]) => { if (c === '1' && ok) resumeConnect() })
onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  loadMarketLinks() // 11번가·연결 신청 상태 (로그인 전이면 부르지 않고 비운다 — 로그인하면 그 모듈이 다시 읽는다)
  if (!loggedIn.value) return // 로그인 전에는 연결 상태를 부르지 않는다 (연결 방법 보기·판매처 목록은 그대로)
  if (route.query.connect === '1') resumeConnect()
  else load()
})
onUnmounted(() => window.removeEventListener('euchs-auth-changed', onStudioAuthChanged))
</script>
