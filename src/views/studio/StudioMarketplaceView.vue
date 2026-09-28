<template>
  <div class="px-4 sm:px-12 py-9 max-w-5xl space-y-6" data-mk-view>
    <div>
      <h2 class="st-h-page">판매처 연결</h2>
      <p class="mt-2 st-desc break-keep">완성한 상세페이지를 판매처에 바로 올려요. 지금은 쿠팡부터 열려 있어요.</p>
    </div>

    <p v-if="loadError" class="text-[14px] font-bold st-danger-text break-keep" data-mk-load-error>{{ loadError }}</p>

    <!-- 연결 카드 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section class="st-card p-5 sm:p-6" data-mk-card="coupang">
        <div class="flex items-center gap-2">
          <span class="st-icon-box"><Store class="w-[18px] h-[18px]" :stroke-width="2" /></span>
          <h3 class="st-h-card">쿠팡</h3>
          <span v-if="st?.connected" class="st-badge ml-auto" :class="st.account.status === 'connected' ? 'st-badge-accent' : 'st-badge-danger'" data-mk-status-badge>{{ STATUS_LABEL[st.account.status] }}</span>
          <span v-else class="st-badge ml-auto">연결 전</span>
        </div>

        <!-- 준비 상태 -->
        <p v-if="st && !st.ready.enc" class="mt-3 text-[13px] font-bold st-danger-text break-keep" data-mk-not-ready>판매처 연결을 준비하고 있어요. (서버 암호화 키 설정 필요 — 관리자에게 알려 주세요)</p>
        <p v-else-if="st && !st.ready.relay" class="mt-3 text-[13px] font-bold st-danger-text break-keep" data-mk-not-ready>쿠팡 중계 서버가 아직 설정되지 않았어요. 연결 확인은 운영 서버에서만 돼요.</p>

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
          <p v-if="st.account.last_error" class="text-[12px] st-danger-text break-keep">마지막 오류: {{ st.account.last_error }}</p>
          <div class="flex flex-wrap gap-2 pt-1">
            <button type="button" class="st-btn" :disabled="!!busy" data-mk-refresh @click="doRefresh">{{ busy === 'refresh' ? '확인 중…' : '출고지·반품지 새로고침' }}</button>
            <button type="button" class="st-btn" :disabled="!!busy" data-mk-rekey @click="openForm(true)">키 교체</button>
            <button type="button" class="st-btn st-btn-danger" :disabled="!!busy" data-mk-disconnect @click="confirmDisconnect = true">연결 해제</button>
          </div>
        </div>

        <!-- 연결 전 -->
        <div v-else-if="st" class="mt-4 space-y-3">
          <p class="st-desc break-keep">쿠팡 Wing에서 OPEN API 키를 발급받아 넣으면 완성작을 쿠팡 상품으로 바로 보낼 수 있어요.</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="st-btn st-btn-primary" data-mk-connect-open @click="openForm(false)">쿠팡 연결하기</button>
            <button type="button" class="st-btn" data-mk-guide-open @click="guideOpen = true">연결 방법 보기</button>
          </div>
        </div>
        <p v-else class="mt-4 st-desc">불러오는 중…</p>
        <p v-if="actionMsg" class="mt-3 text-[13px] font-bold break-keep" :class="actionError ? 'st-danger-text' : 'st-success-text'" data-mk-action-msg>{{ actionMsg }}</p>
      </section>

      <section class="st-card p-5 sm:p-6 space-y-3" data-mk-card="others">
        <h3 class="st-h-card">다른 판매처</h3>
        <ul class="space-y-2">
          <li v-for="m in OTHERS" :key="m" class="flex items-center gap-2 text-[14px] st-ink-2"><span>{{ m }}</span><span class="st-badge ml-auto">준비 중</span></li>
        </ul>
        <p class="st-desc break-keep">쿠팡 다음으로 이어서 준비하고 있어요. 지금은 [내보내기]로 받은 이미지를 직접 올려 주세요.</p>
      </section>
    </div>

    <!-- 출고지·반품지 -->
    <section v-if="st?.connected" class="st-card p-5 sm:p-6" data-mk-places>
      <div class="flex items-center gap-2 mb-3">
        <h3 class="st-h-card">출고지 · 반품지</h3>
        <button type="button" class="st-link-muted ml-auto text-[13px]" @click="guideOpen = true">연결 방법 다시 보기</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
        <div v-for="kind in ['outbound', 'return']" :key="kind">
          <div class="st-label">{{ kind === 'outbound' ? '출고지' : '반품지' }} ({{ placesOf(kind).length }})</div>
          <p v-if="!placesOf(kind).length" class="st-desc">없음 — Wing에서 등록한 뒤 [출고지·반품지 새로고침]</p>
          <ul v-else class="space-y-1.5">
            <li v-for="p in placesOf(kind)" :key="p.id" class="st-surface st-border rounded-[10px] px-3 py-2" :data-mk-place="p.place_code">
              <div class="font-bold st-ink">{{ p.name }} <span class="st-muted font-normal">#{{ p.place_code }}</span><span v-if="!p.usable" class="st-badge st-badge-danger ml-1">사용 불가</span></div>
              <div class="st-desc-sm break-keep">{{ [p.address?.zip, p.address?.address, p.address?.addressDetail].filter(Boolean).join(' ') || '주소 없음' }}<span v-if="p.address?.deliverName"> · {{ p.address.deliverName }}</span></div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <StudioShippingTemplates v-if="st?.connected" ref="templatesRef" />
    <StudioSendList ref="sendsRef" />

    <!-- 연결·키 교체 창 -->
    <StudioModal :open="formOpen" :title="rekey ? '쿠팡 키 교체' : '쿠팡 연결'" wide @close="formOpen = false">
      <form class="space-y-3" data-mk-connect-form @submit.prevent="doConnect">
        <p class="st-desc break-keep">Wing → 판매자정보 → 추가판매정보 → OPEN API 키에서 복사한 값을 넣어 주세요. 키는 암호화해서 저장하고 화면에 다시 보여 주지 않아요.
          <button type="button" class="st-link ml-1" @click="guideOpen = true">연결 방법 보기</button></p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block"><span class="st-label">Wing 로그인 ID *</span><input v-model.trim="form.seller_login_id" class="st-input w-full" maxlength="100" required data-mk-f-login /></label>
          <label class="block"><span class="st-label">업체코드 (Vendor ID) *</span><input v-model.trim="form.vendor_id" class="st-input w-full font-mono" maxlength="20" placeholder="A00012345" required data-mk-f-vendor /></label>
          <label class="block"><span class="st-label">Access Key *</span><input v-model.trim="form.access_key" class="st-input w-full font-mono" maxlength="200" autocomplete="off" required data-mk-f-ak /></label>
          <label class="block"><span class="st-label">Secret Key *</span><input v-model.trim="form.secret_key" type="password" class="st-input w-full font-mono" maxlength="200" autocomplete="new-password" required data-mk-f-sk /></label>
          <label class="block"><span class="st-label">키 유효기간(만료일) *</span><input v-model="form.expires_at" type="date" class="st-input w-full" required data-mk-f-exp /></label>
        </div>
        <p class="st-desc-sm break-keep">저장 전에 출고지·반품지 조회로 키를 확인해요. Wing에 IP {{ st?.relayIp || '3.39.196.112' }}가 등록돼 있어야 해요(반영 최대 30분).</p>
        <p v-if="formError" class="text-[13px] font-bold st-danger-text break-keep" data-mk-connect-error>{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="st-btn" @click="formOpen = false">취소</button>
          <button type="submit" class="st-btn st-btn-primary" :disabled="busy === 'connect'" data-mk-connect-submit>{{ busy === 'connect' ? '확인 중…' : '키 확인하고 연결' }}</button>
        </div>
      </form>
    </StudioModal>

    <StudioModal :open="confirmDisconnect" title="쿠팡 연결을 해제할까요?" @close="confirmDisconnect = false">
      저장된 키·출고지·템플릿을 지워요. 보낸 상품의 처리현황 기록은 남아요.
      <template #actions>
        <button type="button" class="st-btn" @click="confirmDisconnect = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" data-mk-disconnect-confirm @click="doDisconnect">해제</button>
      </template>
    </StudioModal>

    <StudioMarketplaceGuide :open="guideOpen" :relay-ip="st?.relayIp || '3.39.196.112'" @close="guideOpen = false" />
  </div>
</template>

<script setup>
// 판매처 연결 (스튜디오 → 쿠팡 2~3단계, 2026-09-28). 서버 api/marketplace.js — 브라우저는 키를 한 번 보내고 다시 보지 않는다.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Store } from 'lucide-vue-next'
import StudioModal from '@/components/studio/StudioModal.vue'
import StudioMarketplaceGuide from '@/components/studio/StudioMarketplaceGuide.vue'
import StudioShippingTemplates from '@/components/studio/StudioShippingTemplates.vue'
import StudioSendList from '@/components/studio/StudioSendList.vue'
import { getMarketplaceStatus, connectCoupang, disconnectCoupang, refreshPlaces, expiryState, fmtDate } from '@/lib/studioMarketplace'

const STATUS_LABEL = { connected: '연결됨', invalid: '키 확인 필요', expired: '만료됨' }
const OTHERS = ['카페24', '고도몰', '메이크샵']

const st = ref(null)
const loadError = ref('')
const busy = ref('')
const actionMsg = ref('')
const actionError = ref(false)
const guideOpen = ref(false)
const formOpen = ref(false)
const rekey = ref(false)
const formError = ref('')
const confirmDisconnect = ref(false)
const form = ref({ seller_login_id: '', vendor_id: '', access_key: '', secret_key: '', expires_at: '' })
const templatesRef = ref(null)
const sendsRef = ref(null)

const expiry = computed(() => st.value?.connected ? expiryState(st.value.account.expires_at) : { level: 'ok', label: '' })
const placesOf = kind => (st.value?.places || []).filter(p => p.kind === kind)

async function load() {
  loadError.value = ''
  try {
    st.value = await getMarketplaceStatus()
    if (st.value.connected) setTimeout(() => templatesRef.value?.load(), 0)
    sendsRef.value?.load()
  } catch (e) {
    console.error('[StudioMarketplaceView] 상태 조회 실패:', e.code, e)
    loadError.value = e.message
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
  formOpen.value = true
}
function note(msg, isError = false) {
  actionMsg.value = msg
  actionError.value = isError
}
async function doConnect() {
  busy.value = 'connect'
  formError.value = ''
  try {
    st.value = await connectCoupang(form.value)
    form.value.access_key = ''
    form.value.secret_key = ''
    formOpen.value = false
    note(`쿠팡이 연결됐어요. 출고지 ${placesOf('outbound').length}곳 · 반품지 ${placesOf('return').length}곳을 불러왔어요.`)
    setTimeout(() => templatesRef.value?.load(), 0)
  } catch (e) {
    console.error('[StudioMarketplaceView] 연결 실패:', e.code, e)
    formError.value = e.message
  } finally {
    busy.value = ''
  }
}
async function doRefresh() {
  busy.value = 'refresh'
  try {
    st.value = await refreshPlaces()
    note('출고지·반품지를 다시 불러왔어요.')
    templatesRef.value?.load()
  } catch (e) {
    console.error('[StudioMarketplaceView] 출고지 새로고침 실패:', e.code, e)
    note(e.message, true)
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
    note(e.message, true)
  } finally {
    busy.value = ''
  }
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 연결 상태·템플릿·처리현황을 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    st.value = null
    formOpen.value = false
    actionMsg.value = ''
    templatesRef.value?.clear()
    sendsRef.value?.clear()
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
