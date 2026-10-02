<template>
  <div class="px-4 sm:px-12 py-6 max-w-5xl space-y-6" data-mk-view>
    <p class="st-desc break-keep">완성한 상세페이지를 판매처에 바로 등록할 수 있습니다. 가이드를 참고하여 직접 연결하세요.</p>

    <!-- 주문 자격 없음(서버 403 not_customer) — 탭 위에 한 번만. 문구·버튼은 스튜디오 안내 창(StudioLayout)과 같은 것 (studioAccess) -->
    <section v-if="noAccess" class="st-card p-5 sm:p-6 flex flex-wrap items-center gap-3" data-mk-no-access>
      <div class="min-w-0 flex-1">
        <h3 class="st-h-card">{{ STUDIO_NO_ACCESS_TITLE }}</h3>
        <p class="mt-1 st-desc break-keep">{{ STUDIO_NO_ACCESS_BODY }}</p>
      </div>
      <router-link to="/mall" class="st-btn st-btn-primary shrink-0" data-mk-no-access-mall>{{ STUDIO_NO_ACCESS_MALL }}</router-link>
    </section>

    <!-- 이미 읽은 뒤 다시 읽기가 실패한 때만 (처음부터 못 읽으면 쿠팡 카드 안에 "불러오지 못했습니다 [다시 시도]") -->
    <p v-if="loadError && st" class="text-[14px] break-keep" :class="loadSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-load-error>{{ loadError }}</p>

    <!-- 연결 카드 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section class="st-card p-5 sm:p-6" data-mk-card="coupang">
        <div class="flex items-center gap-2">
          <span class="st-icon-box"><Store class="w-[18px] h-[18px]" :stroke-width="2" /></span>
          <h3 class="st-h-card">쿠팡</h3>
          <span v-if="st?.connected" class="st-badge ml-auto" :class="st.account.status === 'connected' ? 'st-badge-accent' : 'st-badge-danger'" data-mk-status-badge>{{ STATUS_LABEL[st.account.status] }}</span>
          <StudioLinkPending v-else-if="cpWaiting" part="badge" :phase="cpPhase" />
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
          <p v-if="expiry.level !== 'ok'" class="text-[12px] font-bold st-danger-text break-keep">Wing에서 키를 재발급한 뒤 [키 교체]로 새 키를 입력하세요.</p>
          <p v-if="st.account.last_error" class="text-[12px] st-danger-text break-keep">마지막 확인 결과: {{ st.account.last_error }}
            <button type="button" class="st-link ml-1" @click="guideOpen = true">연결 방법 보기</button></p>
          <div class="flex flex-wrap gap-2 pt-1">
            <button type="button" class="st-btn" :disabled="!!busy" data-mk-refresh @click="doRefresh">{{ busy === 'refresh' ? '확인 중…' : '출고지·반품지 새로고침' }}</button>
            <button type="button" class="st-btn" :disabled="!!busy" data-mk-rekey @click="openForm(true)">키 교체</button>
            <button type="button" class="st-btn st-btn-danger" :disabled="!!busy" data-mk-disconnect @click="confirmDisconnect = true">연결 해제</button>
          </div>
        </div>

        <!-- 불러오는 중·못 읽음 — "연결 전"·[쿠팡 연결하기]를 그리지 않는다 (studioMarketplaceRules.linkPhase) -->
        <StudioLinkPending v-else-if="cpWaiting" :phase="cpPhase" @retry="load" />
        <!-- 연결 전 (읽은 결과가 연결 안 됨이거나 로그인 전) -->
        <div v-else class="mt-4 space-y-3">
          <p class="st-desc break-keep">쿠팡 Wing에서 발급한 OPEN API 키를 입력하면 상품을 바로 등록할 수 있습니다.</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="st-btn st-btn-primary" :disabled="gating" data-mk-connect-open @click="startConnect">쿠팡 연결하기</button>
            <button type="button" class="st-btn" data-mk-guide-open @click="guideOpen = true">연결 방법 보기</button>
          </div>
        </div>
        <p v-if="actionMsg" class="mt-3 text-[13px] break-keep" :class="TONE_CLASS[actionTone]" data-mk-action-msg>{{ actionMsg }}
          <button v-if="actionGuide" type="button" class="st-link ml-1" data-mk-action-guide @click="guideOpen = true">연결 방법 보기</button></p>
      </section>

      <!-- 11번가 — 쿠팡과 같은 키 연결 (2026-09-30, 연결까지만) -->
      <StudioElevenstCard />
      <!-- 스마트스토어 — 11번가와 같은 키 연결 (2026-09-30 S3-2, 연결까지만) -->
      <StudioSmartstoreCard />
      <!-- 지그재그(카카오스타일) — 파트너센터 인증키 연결 (2026-10-02) -->
      <StudioZigzagCard />
      <!-- 카페24 — 우리 앱 + 카페24 동의 화면 (연결까지만). 2026-10-02 운영 중단 — 판매처 목록(MARKETS off)대로 누구에게도 안 보임 -->
      <StudioCafe24Card v-if="showCafe24" />
    </div>
    <p v-if="marketLinks.error && marketLinks.loaded" class="text-[13px] break-keep" :class="marketLinks.soft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-links-error>{{ marketLinks.error }}</p>

    <!-- 아직 연결할 수 없는 판매처 — 이름 + "예정" 한 단어만 (버튼·입력 칸·안내 문구 없음, S3-3) -->
    <section class="st-card p-5 sm:p-6" data-mk-card="planned">
      <h3 class="st-h-card">다른 판매처</h3>
      <ul class="mt-3 st-border rounded-[10px] st-divide overflow-hidden">
        <li v-for="m in PLANNED" :key="m.key" class="planned-row" :data-mk-planned="m.key">
          <span class="text-[14px] font-bold st-muted truncate">{{ m.name }}</span>
          <span class="st-badge ml-auto shrink-0">{{ PLANNED_LABEL }}</span>
        </li>
      </ul>
    </section>

    <!-- 출고지·반품지 -->
    <section v-if="st?.connected" class="st-card p-5 sm:p-6" data-mk-places>
      <div class="flex items-center gap-2 mb-3">
        <h3 class="st-h-card">출고지 · 반품지</h3>
        <button type="button" class="st-link-muted ml-auto text-[13px]" @click="guideOpen = true">연결 방법 다시 보기</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
        <div v-for="kind in ['outbound', 'return']" :key="kind">
          <div class="st-label">{{ kind === 'outbound' ? '출고지' : '반품지' }} ({{ placesOf(kind).length }})</div>
          <p v-if="!placesOf(kind).length" class="st-desc break-keep">등록된 항목이 없습니다. Wing에서 등록한 뒤 [출고지·반품지 새로고침]을 누르세요.</p>
          <ul v-else class="space-y-1.5">
            <li v-for="p in placesOf(kind)" :key="p.id" class="st-surface st-border rounded-[10px] px-3 py-2" :data-mk-place="p.place_code">
              <div class="font-bold st-ink">{{ p.name }} <span class="st-muted font-normal">#{{ p.place_code }}</span><span v-if="!p.usable" class="st-badge st-badge-danger ml-1">사용 불가</span></div>
              <div class="st-desc-sm break-keep">{{ [p.address?.zip, p.address?.address, p.address?.addressDetail].filter(Boolean).join(' ') || '주소 없음' }}<span v-if="p.address?.deliverName"> · {{ p.address.deliverName }}</span></div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <p v-if="st?.connected" class="st-desc break-keep" data-mk-next>다음 단계: <router-link :to="{ name: 'studio-channels-defaults' }" class="st-link">[기본 설정]</router-link>에서 배송·반품 템플릿을 만들어 두면 <router-link :to="{ name: 'studio-projects' }" class="st-link">[내 상품]</router-link>에서 상품을 보낼 수 있습니다.</p>

    <!-- 연결·키 교체 창 -->
    <StudioModal :open="formOpen" :title="rekey ? '쿠팡 키 교체' : '쿠팡 연결'" wide @close="formOpen = false">
      <form class="space-y-3" data-mk-connect-form @submit.prevent="doConnect">
        <p class="st-desc break-keep">Wing → 판매자정보 → 추가판매정보 → OPEN API 키에서 복사한 값을 입력하세요. 키는 안전하게 보관하며 화면에 다시 표시하지 않습니다.
          <button type="button" class="st-link ml-1" @click="guideOpen = true">연결 방법 보기</button></p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block"><span class="st-label">Wing 로그인 ID *</span><input v-model.trim="form.seller_login_id" class="st-input w-full" maxlength="100" required data-mk-f-login /></label>
          <label class="block"><span class="st-label">업체코드 (Vendor ID) *</span><input v-model.trim="form.vendor_id" class="st-input w-full font-mono" maxlength="20" placeholder="A00012345" required data-mk-f-vendor /></label>
          <label class="block"><span class="st-label">Access Key *</span><input v-model.trim="form.access_key" class="st-input w-full font-mono" maxlength="200" autocomplete="off" required data-mk-f-ak /></label>
          <label class="block"><span class="st-label">Secret Key *</span><input v-model.trim="form.secret_key" type="password" class="st-input w-full font-mono" maxlength="200" autocomplete="new-password" required data-mk-f-sk /></label>
          <label class="block"><span class="st-label">키 유효기간(만료일) *</span><input v-model="form.expires_at" type="date" class="st-input w-full" required data-mk-f-exp /></label>
        </div>
        <p class="st-desc-sm break-keep">저장 전에 출고지·반품지 조회로 키를 확인합니다. Wing에 IP {{ st?.relayIp || '3.39.196.112' }}가 등록되어 있어야 합니다(반영 최대 30분).</p>
        <p v-if="formError" class="text-[13px] break-keep" :class="TONE_CLASS[formTone]" data-mk-connect-error>{{ formError }}
          <button v-if="formGuide" type="button" class="st-link ml-1" data-mk-connect-guide @click="guideOpen = true">연결 방법 보기</button></p>
        <div class="flex justify-end gap-2">
          <button type="button" class="st-btn" @click="formOpen = false">취소</button>
          <button type="submit" class="st-btn st-btn-primary" :disabled="busy === 'connect'" data-mk-connect-submit>{{ busy === 'connect' ? '확인 중…' : '키 확인하고 연결' }}</button>
        </div>
      </form>
    </StudioModal>

    <StudioModal :open="confirmDisconnect" title="쿠팡 연결을 해제하시겠습니까?" @close="confirmDisconnect = false">
      저장된 키·출고지·템플릿이 삭제됩니다. 보낸 상품 기록은 유지됩니다.
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
import { currentUser, isAdminOrStaff, isAuthLoading } from '@/lib/auth'
import StudioLinkPending from '@/components/studio/StudioLinkPending.vue'
import { studioGate } from '@/lib/studioGate'
import StudioModal from '@/components/studio/StudioModal.vue'
import StudioMarketplaceGuide from '@/components/studio/StudioMarketplaceGuide.vue'
import { getMarketplaceStatus, connectCoupang, disconnectCoupang, refreshPlaces, expiryState, fmtDate, isNotReady, needsGuide } from '@/lib/studioMarketplace'
import StudioElevenstCard from '@/components/studio/StudioElevenstCard.vue'
import StudioSmartstoreCard from '@/components/studio/StudioSmartstoreCard.vue'
import StudioZigzagCard from '@/components/studio/StudioZigzagCard.vue'
import StudioCafe24Card from '@/components/studio/StudioCafe24Card.vue'
import { marketLinks, loadMarketLinks, marketLinksPhase } from '@/lib/studioMarketLinks'
import { STUDIO_NO_ACCESS_TITLE, STUDIO_NO_ACCESS_BODY, STUDIO_NO_ACCESS_MALL } from '@/lib/studioAccess'
import { MARKETS, PLANNED_LABEL, marketVisible, linkPhase, NOT_CUSTOMER } from '@/lib/studioMarketplaceRules'

const STATUS_LABEL = { connected: '연결됨', invalid: '키 확인 필요', expired: '만료됨' }
const TONE_CLASS = { ok: 'font-bold st-success-text', error: 'font-bold st-danger-text', soft: 'st-muted' }
const toneOf = e => isNotReady(e.code) ? 'soft' : 'error'

const route = useRoute()
const router = useRouter()

// 카페24 카드 — 보이는 범위는 판매처 목록 한 곳(marketVisible — 2026-10-02 운영 중단 off: 누구에게도 카드·"예정" 줄 없음. 앱 열기·동의 뒤 돌아옴도 처리하지 않음)
const showCafe24 = computed(() => marketVisible('cafe24', { admin: isAdminOrStaff.value }))
// 쿠팡 밖의 판매처 — 키 연결은 카드(StudioElevenstCard·StudioSmartstoreCard·StudioCafe24Card), 아직 연결할 수 없는 곳은 "예정"만. 상태는 studioMarketLinks 한 곳
const PLANNED = MARKETS.filter(m => m.connect === 'planned')
const loggedIn = computed(() => !!currentUser.value?.id)
const st = ref(null)
const loadError = ref('')
const loadCode = ref('') // 못 읽은 서버 코드 — not_customer = 주문 자격 없음(linkPhase 'locked')
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

// 쿠팡 카드 표시 단계 — 상태(st)를 읽기 전에는 "연결 전" 대신 자리표시, 처음부터 못 읽으면 "불러오지 못했습니다 [다시 시도]"
// 'locked'(주문 자격 없음)이면 "연결 전" + [쿠팡 연결하기] 그대로 — 누르면 studioGate가 주문 고객 안내 창을 연다
const cpPhase = computed(() => linkPhase({ authLoading: isAuthLoading.value, loggedIn: loggedIn.value, loaded: !!st.value, error: loadError.value, code: loadCode.value }))
const cpWaiting = computed(() => cpPhase.value === 'checking' || cpPhase.value === 'failed')
const noAccess = computed(() => cpPhase.value === 'locked' || marketLinksPhase.value === 'locked')
const expiry = computed(() => st.value?.connected ? expiryState(st.value.account.expires_at) : { level: 'ok', label: '' })
const placesOf = kind => (st.value?.places || []).filter(p => p.kind === kind)

// 읽는 중에 또 부르면(마운트·로그인 이벤트·로그인 사용자 바뀜이 겹칠 때) 같은 요청을 같이 쓴다 — 요청 한 번
let loading = null
function load() {
  if (loading) return loading
  loading = (async () => {
    // 못 읽은 상태면 다시 "확인 중"으로. 주문 자격 없음(locked)은 다시 읽는 동안에도 그대로(탭 복귀마다 깜빡이지 않게)
    if (loadCode.value !== NOT_CUSTOMER) {
      loadError.value = ''
      loadCode.value = ''
    }
    try {
      st.value = await getMarketplaceStatus()
      loadError.value = ''
      loadCode.value = ''
    } catch (e) {
      console.error('[StudioMarketplaceView] 상태 조회 실패:', e.code, e)
      loadError.value = e.message
      loadCode.value = e.code || ''
      loadSoft.value = isNotReady(e.code)
    }
  })().finally(() => { loading = null })
  return loading
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
    note(`쿠팡이 연결되었습니다. 출고지 ${placesOf('outbound').length}곳 · 반품지 ${placesOf('return').length}곳을 불러왔습니다.`)
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
    note('출고지·반품지를 다시 불러왔습니다.')
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
    note('쿠팡 연결이 해제되었습니다.')
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
    loadCode.value = ''
  } else if (route.query.connect !== '1') { // ?connect=1이면 아래 watch가 읽고 이어서 연다
    load()
  }
}
// 이메일 로그인은 같은 화면에 ?connect=1만 붙여 돌아온다(onMounted가 다시 돌지 않음) → 주소·로그인 상태를 지켜본다
watch(() => [route.query.connect, loggedIn.value], ([c, ok]) => { if (c === '1' && ok) resumeConnect() })
// 로그인한 사용자가 바뀌면 이벤트가 오지 않아도 읽는다 (2026-09-30 운영: 마운트 때 로그인 복원 전이면 onMounted가 읽지 않고,
// auth.js initAuth가 세션 복원 때 currentUser만 채우고 euchs-auth-changed를 보내지 않으면 쿠팡 카드가 "확인 중"(글자로는 제목만)에 멈췄다)
watch(() => currentUser.value?.id, (uid, prev) => { if (uid && uid !== prev && route.query.connect !== '1') load() })
onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  loadMarketLinks() // 11번가·연결 신청 상태 (로그인 전이면 부르지 않고 비운다 — 로그인하면 그 모듈이 다시 읽는다)
  if (!loggedIn.value) return // 로그인 전에는 연결 상태를 부르지 않는다 (로그인되면 위 watch·euchs-auth-changed가 읽는다)
  if (route.query.connect === '1') resumeConnect()
  else load()
})
onUnmounted(() => window.removeEventListener('euchs-auth-changed', onStudioAuthChanged))
</script>

<style scoped>
.planned-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--st-soft); min-height: 46px; }
</style>
