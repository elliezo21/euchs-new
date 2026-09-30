<template>
  <section class="st-card p-5 sm:p-6" data-mk-card="cafe24">
    <div class="flex items-center gap-2">
      <span class="st-icon-box"><Store class="w-[18px] h-[18px]" :stroke-width="2" /></span>
      <h3 class="st-h-card">카페24</h3>
      <span v-if="linked" class="st-badge ml-auto" :class="acc?.status === 'connected' ? 'st-badge-accent' : 'st-badge-danger'" data-mk-c24-badge>{{ STATUS_LABEL[acc?.status] || '연결됨' }}</span>
      <span v-else class="st-badge ml-auto">연결 전</span>
    </div>

    <div v-if="linked" class="mt-4 space-y-2 text-[13px]" data-mk-c24-connected>
      <div class="grid grid-cols-[108px_1fr] gap-y-1.5">
        <span class="st-muted">쇼핑몰 ID</span><span class="st-ink font-bold">{{ acc.mall_id }}</span>
        <span class="st-muted">마지막 확인</span><span class="st-ink">{{ fmtDate(acc.last_checked_at) }}</span>
      </div>
      <p v-if="acc.status !== 'connected'" class="text-[12px] font-bold st-danger-text break-keep" data-mk-c24-relink>[다시 연결]을 눌러 카페24 동의를 한 번 더 해 주세요.</p>
      <div class="flex flex-wrap gap-2 pt-1">
        <button type="button" class="st-btn" :disabled="!!busy" data-mk-c24-rekey @click="start">다시 연결</button>
        <button type="button" class="st-btn st-btn-danger" :disabled="!!busy" data-mk-c24-disconnect @click="confirmOff = true">연결 해제</button>
      </div>
    </div>
    <div v-else class="mt-4 space-y-3">
      <ol class="guide-steps" data-mk-c24-guide>
        <li v-for="(s, i) in CAFE24_GUIDE" :key="i"><span class="guide-no">{{ i + 1 }}</span><span class="break-keep">{{ s }}</span></li>
      </ol>
      <p class="st-desc-sm break-keep" data-mk-c24-guide-alt>{{ CAFE24_GUIDE_ALT }}</p>
      <button type="button" class="st-btn st-btn-primary" :disabled="!!busy" data-mk-c24-open @click="start">{{ busy === 'finish' || busy === 'launch' ? '연결 확인 중…' : '연결하기' }}</button>
    </div>
    <p v-if="msg" class="mt-3 text-[13px] break-keep" :class="msgTone" data-mk-c24-msg>{{ msg }}</p>

    <!-- 연결 창 — 쇼핑몰 ID 하나 → 카페24 동의 화면으로 -->
    <StudioModal :open="formOpen" title="카페24 연결" @close="formOpen = false">
      <form class="space-y-4" data-mk-c24-form @submit.prevent="submit">
        <p class="st-desc break-keep">[연결하기]를 누르면 카페24 화면으로 이동해요. 쇼핑몰 대표 운영자 계정으로 로그인하고 동의해 주세요.</p>
        <label class="block">
          <span class="st-label">쇼핑몰 ID *</span>
          <input v-model.trim="form.mallId" class="st-input w-full" maxlength="60" autocomplete="off" placeholder="myshop" data-mk-c24-f-mall />
          <span class="block mt-1 text-[12px] st-muted break-keep">쇼핑몰 주소가 myshop.cafe24.com이면 myshop이에요.</span>
        </label>
        <p v-if="formTried && problems.length" class="text-[13px] font-bold st-danger-text" data-mk-c24-missing>확인해 주세요: {{ problems.join(', ') }}</p>
        <p v-if="formError" class="text-[13px] break-keep" :class="formSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-c24-error>{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="st-btn" @click="formOpen = false">취소</button>
          <button type="submit" class="st-btn st-btn-primary" :disabled="busy === 'begin'" data-mk-c24-submit>{{ busy === 'begin' ? '카페24로 이동 중…' : '연결하기' }}</button>
        </div>
      </form>
    </StudioModal>

    <StudioModal :open="confirmOff" title="카페24 연결을 해제할까요?" @close="confirmOff = false">
      저장된 연결 정보를 지워요. 다시 연결하려면 [연결하기]를 눌러 주세요.
      <template #actions>
        <button type="button" class="st-btn" @click="confirmOff = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" data-mk-c24-disconnect-confirm @click="disconnect">해제</button>
      </template>
    </StudioModal>
  </section>
</template>

<script setup>
// 판매처 > 연결 — 카페24 카드 (2026-09-30 앱 방식). 고객은 쇼핑몰 ID만 넣는다 — 앱은 우리 앱 "EUCHS 스튜디오" 하나(값은 서버 환경변수에만)
//   [연결하기] → 쇼핑몰 ID → 서버 cafe24_begin(동의 주소 — DB 쓰기 없음) → 카페24 동의 화면
//   → 카페24가 이 탭(/studio/channels/connect?code=&state=c24.…)으로 돌려보냄 → 서버 cafe24_finish(state·코드 확인, 토큰 암호화 저장) → 연결됨
// 쇼핑몰 관리자에서 우리 앱을 열면(App URL = 같은 주소 ?mall_id=…&hmac=…) — 쿼리 원문은 studioCafe24Launch가 라우터보다 먼저 적어 둔다
//   → 로그인돼 있으면 서버 cafe24_launch(hmac 확인)로 바로 동의 화면, 아니면 로그인 뒤 이어서. hmac이 틀리면 연결하지 않고 안내만
// 코드는 1분·1회라 돌아오자마자 바로 보낸다. 주소의 code·state·App URL 칸은 한 번 쓰고 뗀다(새로고침해도 다시 보내지 않게)
// [연결하기]·[다시 연결] = 작업 시작 관문(studioGate) — 로그인 전 → 로그인 창, 돌아오면 ?link=cafe24로 이어서
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Store } from 'lucide-vue-next'
import StudioModal from '@/components/studio/StudioModal.vue'
import { currentUser } from '@/lib/auth'
import { studioGate } from '@/lib/studioGate'
import { beginCafe24, launchCafe24, finishCafe24, disconnectCafe24, fmtDate, isNotReady } from '@/lib/studioMarketplace'
import { cafe24MallProblems, isCafe24Return, isCafe24Launch, CAFE24_LAUNCH_KEYS } from '@/lib/studioMarketplaceRules'
import { takeCafe24Launch, hasCafe24Launch } from '@/lib/studioCafe24Launch'
import { CAFE24_GUIDE, CAFE24_GUIDE_ALT } from '@/lib/studioMarketGuides'
import { marketLinks, applyMarketLinks } from '@/lib/studioMarketLinks'

const STATUS_LABEL = { connected: '연결됨', invalid: '다시 연결 필요', expired: '다시 연결 필요' }
const route = useRoute()
const router = useRouter()
const linked = computed(() => marketLinks.cafe24?.connected === true)
const acc = computed(() => marketLinks.cafe24?.account || null)

const busy = ref('')
const msg = ref('')
const msgTone = ref('st-success-text font-bold')
const formOpen = ref(false)
const confirmOff = ref(false)
const form = ref({ mallId: '' })
const formTried = ref(false)
const formError = ref('')
const formSoft = ref(false)
const problems = computed(() => cafe24MallProblems(form.value))

function say(text, tone) {
  msg.value = text
  msgTone.value = tone === 'ok' ? 'st-success-text font-bold' : tone === 'soft' ? 'st-muted' : 'font-bold st-danger-text'
}
async function start() {
  if (busy.value) return
  busy.value = 'gate'
  let go = false
  try {
    go = await studioGate('/studio/channels/connect?link=cafe24')
  } finally {
    busy.value = ''
  }
  if (!go) return
  if (hasCafe24Launch()) return runLaunch() // 쇼핑몰 관리자에서 앱을 열고 들어온 경우 — 쇼핑몰 ID를 묻지 않는다
  form.value = { mallId: acc.value?.mall_id || '' }
  formTried.value = false
  formError.value = ''
  formOpen.value = true
}
async function submit() {
  formTried.value = true
  if (problems.value.length) return
  busy.value = 'begin'
  formError.value = ''
  try {
    const r = await beginCafe24(form.value.mallId)
    window.location.assign(r.authorizeUrl) // 카페24 동의 화면 — 돌아오면 아래 watch가 마무리한다
  } catch (e) {
    console.error('[StudioCafe24Card] 카페24 연결 시작 실패:', e.code, e)
    formError.value = e.message
    formSoft.value = isNotReady(e.code)
    busy.value = ''
  }
}
// App URL로 들어옴 — 적어 둔 쿼리 원문을 서버에 보내 hmac 확인 → 맞으면 바로 동의 화면
async function runLaunch() {
  const raw = takeCafe24Launch()
  if (!raw) { say('카페24에서 연 주소가 오래됐어요. 쇼핑몰 ID를 넣고 [연결하기]를 눌러 주세요.', 'error'); return }
  busy.value = 'launch'
  try {
    const r = await launchCafe24(raw)
    window.location.assign(r.authorizeUrl)
  } catch (e) {
    console.error('[StudioCafe24Card] 카페24 앱 실행 확인 실패:', e.code, e)
    say(e.message, isNotReady(e.code) ? 'soft' : 'error')
    busy.value = ''
  }
}
async function finish(q) {
  const { code, state, error, error_description, ...rest } = q
  router.replace({ query: rest })
  if (typeof error === 'string') {
    console.warn('[StudioCafe24Card] 카페24 동의가 끝나지 않음:', error, error_description || '')
    say('카페24 동의를 마치지 않았어요. [연결하기]를 다시 눌러 주세요.', 'error')
    return
  }
  busy.value = 'finish'
  try {
    applyMarketLinks(await finishCafe24(code, state))
    say('카페24가 연결됐어요.', 'ok')
  } catch (e) {
    console.error('[StudioCafe24Card] 카페24 연결 마무리 실패:', e.code, e)
    say(e.message, isNotReady(e.code) ? 'soft' : 'error')
  } finally {
    busy.value = ''
  }
}
async function disconnect() {
  confirmOff.value = false
  busy.value = 'disconnect'
  try {
    applyMarketLinks(await disconnectCafe24())
    say('카페24 연결을 해제했어요.', 'soft')
  } catch (e) {
    console.error('[StudioCafe24Card] 카페24 연결 해제 실패:', e.code, e)
    say(e.message, isNotReady(e.code) ? 'soft' : 'error')
  } finally {
    busy.value = ''
  }
}

// 카페24 동의 뒤 돌아옴 — 로그인이 풀려 있으면 로그인된 뒤에 보낸다(주소는 그때까지 둔다)
watch(() => [route.query.state, currentUser.value?.id], ([, uid]) => {
  if (!uid || !isCafe24Return(route.query) || busy.value === 'finish') return
  finish({ ...route.query })
}, { immediate: true })
// 쇼핑몰 관리자에서 앱을 열고 들어옴 — 주소의 App URL 칸을 떼고(원문은 이미 적어 둠) 관문을 거쳐 이어서
watch(() => route.query.hmac, () => {
  if (!isCafe24Launch(route.query)) return
  const rest = { ...route.query }
  for (const k of CAFE24_LAUNCH_KEYS) delete rest[k]
  router.replace({ query: rest })
  if (!hasCafe24Launch()) { console.error('[StudioCafe24Card] App URL로 들어왔지만 쿼리 원문이 적혀 있지 않음'); say('카페24에서 연 주소를 확인하지 못했어요. 쇼핑몰 ID를 넣고 [연결하기]를 눌러 주세요.', 'error'); return }
  start()
}, { immediate: true })
// 로그인 뒤 이어서 — ?link=cafe24 (한 번 쓰고 주소에서 뗀다)
watch(() => [route.query.link, currentUser.value?.id], ([l, uid]) => {
  if (l !== 'cafe24' || !uid) return
  const { link, ...rest } = route.query
  router.replace({ query: rest })
  start()
}, { immediate: true })
// 로그아웃 — 열린 창·입력값을 비운다 (상태는 studioMarketLinks가 비운다)
watch(() => currentUser.value?.id, uid => { if (!uid) { formOpen.value = false; confirmOff.value = false; form.value = { mallId: '' }; msg.value = '' } })
</script>

<style scoped>
.guide-steps { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; background: var(--st-soft); }
.guide-steps li { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--st-ink); }
.guide-no { flex: none; width: 20px; height: 20px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; background: var(--st-accent); color: #fff; }
</style>
