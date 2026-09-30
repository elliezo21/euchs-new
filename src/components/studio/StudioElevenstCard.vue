<template>
  <section class="st-card p-5 sm:p-6" data-mk-card="11st">
    <div class="flex items-center gap-2">
      <span class="st-icon-box"><Store class="w-[18px] h-[18px]" :stroke-width="2" /></span>
      <h3 class="st-h-card">11번가</h3>
      <span v-if="linked" class="st-badge st-badge-accent ml-auto" data-mk-11st-badge>{{ acc?.status === 'invalid' ? '키 확인 필요' : '연결됨' }}</span>
      <span v-else class="st-badge ml-auto">연결 전</span>
    </div>

    <div v-if="linked" class="mt-4 space-y-2 text-[13px]" data-mk-11st-connected>
      <div class="grid grid-cols-[92px_1fr] gap-y-1.5">
        <span class="st-muted">셀러 ID</span><span class="st-ink font-bold">{{ acc.seller_login_id }}</span>
        <span class="st-muted">API 키</span><span class="st-ink font-mono">•••• {{ acc.key_last4 }}</span>
        <span class="st-muted">마지막 확인</span><span class="st-ink">{{ fmtDate(acc.last_checked_at) }}</span>
      </div>
      <div class="flex flex-wrap gap-2 pt-1">
        <button type="button" class="st-btn" :disabled="!!busy" data-mk-11st-rekey @click="start">키 교체</button>
        <button type="button" class="st-btn st-btn-danger" :disabled="!!busy" data-mk-11st-disconnect @click="confirmOff = true">연결 해제</button>
      </div>
    </div>
    <div v-else class="mt-4 space-y-3">
      <p class="st-desc break-keep">11번가 오픈API 키를 넣으면 스튜디오와 연결돼요. 키는 안전하게 보관하고 화면에 다시 보여 주지 않아요.</p>
      <button type="button" class="st-btn st-btn-primary" :disabled="!!busy" data-mk-11st-open @click="start">연결하기</button>
    </div>
    <p v-if="msg" class="mt-3 text-[13px] break-keep" :class="msgTone" data-mk-11st-msg>{{ msg }}</p>

    <!-- 연결 창 — 가이드 + 셀러 ID·API 키 -->
    <StudioModal :open="formOpen" title="11번가 연결" wide @close="formOpen = false">
      <form class="space-y-4" data-mk-11st-form @submit.prevent="submit">
        <ol class="guide-steps" data-mk-11st-guide>
          <li v-for="(s, i) in ELEVENST_GUIDE" :key="i">
            <span class="guide-no">{{ i + 1 }}</span>
            <span class="flex-1 min-w-0">
              <span class="break-keep">
                <template v-if="s.includes(RELAY_IP)">{{ s.split(RELAY_IP)[0] }}<code class="ip-chip">{{ RELAY_IP }}</code><button type="button" class="copy-btn" data-mk-11st-copy-ip @click="copyIp">{{ ipCopied ? '복사됨' : '복사' }}</button>{{ s.split(RELAY_IP)[1] }}</template>
                <template v-else>{{ s }}</template>
              </span>
              <button v-if="photoIndexForStep('11st', i) >= 0" type="button" class="photo-link" :data-mk-11st-step-photo="i" @click="photos?.openAt(photoIndexForStep('11st', i))">사진</button>
              <span v-if="ELEVENST_STEP_NOTES[i]" class="block mt-1 text-[12px] st-muted break-keep" data-mk-11st-step-note>{{ ELEVENST_STEP_NOTES[i] }}</span>
            </span>
          </li>
        </ol>
        <StudioGuidePhotos ref="photos" market="11st" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block"><span class="st-label">11번가 셀러 ID *</span><input v-model.trim="form.sellerId" class="st-input w-full" maxlength="100" autocomplete="off" data-mk-11st-f-id /></label>
          <label class="block"><span class="st-label">API 키 *</span><input v-model.trim="form.apiKey" type="password" class="st-input w-full font-mono" maxlength="200" autocomplete="new-password" data-mk-11st-f-key /></label>
        </div>
        <p v-if="formTried && problems.length" class="text-[13px] font-bold st-danger-text" data-mk-11st-missing>확인해 주세요: {{ problems.join(', ') }}</p>
        <p v-if="formError" class="text-[13px] break-keep" :class="formSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-11st-error>{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="st-btn" @click="formOpen = false">취소</button>
          <button type="submit" class="st-btn st-btn-primary" :disabled="busy === 'connect'" data-mk-11st-submit>{{ busy === 'connect' ? '확인 중…' : '연결 확인' }}</button>
        </div>
      </form>
    </StudioModal>

    <StudioModal :open="confirmOff" title="11번가 연결을 해제할까요?" @close="confirmOff = false">
      저장된 API 키를 지워요. 다시 연결하려면 키를 새로 넣어 주세요.
      <template #actions>
        <button type="button" class="st-btn" @click="confirmOff = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" data-mk-11st-disconnect-confirm @click="disconnect">해제</button>
      </template>
    </StudioModal>
  </section>
</template>

<script setup>
// 판매처 > 연결 — 11번가 카드 (2026-09-30). 쿠팡과 같은 방식: 키는 서버(api/marketplace.js connect_11st)가 중계 경유로 확인한 뒤 암호화 저장, 화면에는 끝 4자리만.
// [연결하기]·[키 교체] = 작업 시작 관문(studioGate) — 로그인 전 → 로그인 창, 돌아오면 ?link=11st로 창을 이어서 연다 · 주문 없음 → 잠금 창
// 상품 보내기는 다음 작업 — 여기서는 연결까지만
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Store } from 'lucide-vue-next'
import StudioModal from '@/components/studio/StudioModal.vue'
import { currentUser } from '@/lib/auth'
import { studioGate } from '@/lib/studioGate'
import { connectElevenst, disconnectElevenst, fmtDate, isNotReady } from '@/lib/studioMarketplace'
import { elevenstKeyProblems } from '@/lib/studioMarketplaceRules'
import { ELEVENST_GUIDE, ELEVENST_STEP_NOTES, RELAY_IP, photoIndexForStep } from '@/lib/studioMarketGuides'
import StudioGuidePhotos from '@/components/studio/StudioGuidePhotos.vue'
import { marketLinks, applyMarketLinks } from '@/lib/studioMarketLinks'

const route = useRoute()
const router = useRouter()
const linked = computed(() => marketLinks.elevenst?.connected === true)
const acc = computed(() => marketLinks.elevenst?.account || null)

const busy = ref('')
const msg = ref('')
const msgTone = ref('st-success-text font-bold')
const formOpen = ref(false)
const confirmOff = ref(false)
const form = ref({ sellerId: '', apiKey: '' })
const formTried = ref(false)
const formError = ref('')
const formSoft = ref(false)
const problems = computed(() => elevenstKeyProblems(form.value))
const photos = ref(null)
const ipCopied = ref(false)
async function copyIp() {
  try {
    await navigator.clipboard.writeText(RELAY_IP)
    ipCopied.value = true
    setTimeout(() => { ipCopied.value = false }, 1500)
  } catch (e) {
    console.error('[StudioElevenstCard] IP 복사 실패:', e)
  }
}

async function start() {
  if (busy.value) return
  busy.value = 'gate'
  try {
    if (!(await studioGate('/studio/channels/connect?link=11st'))) return
    form.value = { sellerId: acc.value?.seller_login_id || '', apiKey: '' }
    formTried.value = false
    formError.value = ''
    formOpen.value = true
  } finally {
    busy.value = ''
  }
}
async function submit() {
  formTried.value = true
  if (problems.value.length) return
  busy.value = 'connect'
  formError.value = ''
  try {
    applyMarketLinks(await connectElevenst({ seller_login_id: form.value.sellerId, api_key: form.value.apiKey }))
    form.value.apiKey = ''
    formOpen.value = false
    msg.value = '11번가가 연결됐어요.'
    msgTone.value = 'st-success-text font-bold'
  } catch (e) {
    console.error('[StudioElevenstCard] 11번가 연결 실패:', e.code, e)
    formError.value = e.message
    formSoft.value = isNotReady(e.code)
  } finally {
    busy.value = ''
  }
}
async function disconnect() {
  confirmOff.value = false
  busy.value = 'disconnect'
  try {
    applyMarketLinks(await disconnectElevenst())
    msg.value = '11번가 연결을 해제했어요.'
    msgTone.value = 'st-muted'
  } catch (e) {
    console.error('[StudioElevenstCard] 11번가 연결 해제 실패:', e.code, e)
    msg.value = e.message
    msgTone.value = isNotReady(e.code) ? 'st-muted' : 'font-bold st-danger-text'
  } finally {
    busy.value = ''
  }
}

// 로그인 뒤 이어서 — ?link=11st (한 번 쓰고 주소에서 뗀다)
watch(() => [route.query.link, currentUser.value?.id], ([l, uid]) => {
  if (l !== '11st' || !uid) return
  const { link, ...rest } = route.query
  router.replace({ query: rest })
  start()
}, { immediate: true })
// 로그아웃 — 열린 창·입력값을 비운다 (상태는 studioMarketLinks가 비운다)
watch(() => currentUser.value?.id, uid => { if (!uid) { formOpen.value = false; confirmOff.value = false; form.value = { sellerId: '', apiKey: '' }; msg.value = '' } })
</script>

<style scoped>
.guide-steps { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; background: var(--st-soft); }
.guide-steps li { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--st-ink); }
.ip-chip { font-family: ui-monospace, monospace; font-weight: 800; padding: 1px 6px; border-radius: 5px; background: var(--st-card, #fff); border: 1px solid var(--st-line); }
.copy-btn { margin: 0 4px; padding: 1px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #fff; background: var(--st-accent); }
.photo-link { margin-left: 6px; font-size: 12px; font-weight: 700; color: var(--st-accent); text-decoration: underline; text-underline-offset: 2px; }
.guide-no { flex: none; width: 20px; height: 20px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; background: var(--st-accent); color: #fff; }
</style>
