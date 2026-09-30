<template>
  <section class="st-card p-5 sm:p-6" data-mk-card="smartstore">
    <div class="flex items-center gap-2">
      <span class="st-icon-box"><Store class="w-[18px] h-[18px]" :stroke-width="2" /></span>
      <h3 class="st-h-card">스마트스토어</h3>
      <span v-if="linked" class="st-badge st-badge-accent ml-auto" data-mk-ss-badge>{{ acc?.status === 'invalid' ? '키 확인 필요' : '연결됨' }}</span>
      <span v-else class="st-badge ml-auto">연결 전</span>
    </div>

    <div v-if="linked" class="mt-4 space-y-2 text-[13px]" data-mk-ss-connected>
      <div class="grid grid-cols-[108px_1fr] gap-y-1.5">
        <span class="st-muted">애플리케이션 ID</span><span class="st-ink font-mono">•••• {{ acc.key_last4 }}</span>
        <span class="st-muted">마지막 확인</span><span class="st-ink">{{ fmtDate(acc.last_checked_at) }}</span>
      </div>
      <div class="flex flex-wrap gap-2 pt-1">
        <button type="button" class="st-btn" :disabled="!!busy" data-mk-ss-rekey @click="start">키 교체</button>
        <button type="button" class="st-btn st-btn-danger" :disabled="!!busy" data-mk-ss-disconnect @click="confirmOff = true">연결 해제</button>
      </div>
    </div>
    <div v-else class="mt-4 space-y-3">
      <p class="st-desc break-keep">네이버 커머스API센터에서 만든 내 스토어 애플리케이션의 ID·시크릿을 넣으면 연결돼요. 시크릿은 안전하게 보관하고 화면에 다시 보여 주지 않아요.</p>
      <button type="button" class="st-btn st-btn-primary" :disabled="!!busy" data-mk-ss-open @click="start">연결하기</button>
    </div>
    <p v-if="msg" class="mt-3 text-[13px] break-keep" :class="msgTone" data-mk-ss-msg>{{ msg }}</p>

    <!-- 연결 창 — 가이드 + 애플리케이션 ID·시크릿 -->
    <StudioModal :open="formOpen" title="스마트스토어 연결" wide @close="formOpen = false">
      <form class="space-y-4" data-mk-ss-form @submit.prevent="submit">
        <ol class="guide-steps" data-mk-ss-guide>
          <li v-for="(s, i) in SMARTSTORE_GUIDE" :key="i"><span class="guide-no">{{ i + 1 }}</span><span class="break-keep">{{ s }}</span></li>
        </ol>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block"><span class="st-label">애플리케이션 ID *</span><input v-model.trim="form.clientId" class="st-input w-full font-mono" maxlength="200" autocomplete="off" data-mk-ss-f-id /></label>
          <label class="block"><span class="st-label">애플리케이션 시크릿 *</span><input v-model.trim="form.clientSecret" type="password" class="st-input w-full font-mono" maxlength="200" autocomplete="new-password" data-mk-ss-f-secret /></label>
        </div>
        <p v-if="formTried && problems.length" class="text-[13px] font-bold st-danger-text" data-mk-ss-missing>확인해 주세요: {{ problems.join(', ') }}</p>
        <p v-if="formError" class="text-[13px] break-keep" :class="formSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-ss-error>{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="st-btn" @click="formOpen = false">취소</button>
          <button type="submit" class="st-btn st-btn-primary" :disabled="busy === 'connect'" data-mk-ss-submit>{{ busy === 'connect' ? '확인 중…' : '연결 확인' }}</button>
        </div>
      </form>
    </StudioModal>

    <StudioModal :open="confirmOff" title="스마트스토어 연결을 해제할까요?" @close="confirmOff = false">
      저장된 애플리케이션 ID·시크릿을 지워요. 다시 연결하려면 새로 넣어 주세요.
      <template #actions>
        <button type="button" class="st-btn" @click="confirmOff = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" data-mk-ss-disconnect-confirm @click="disconnect">해제</button>
      </template>
    </StudioModal>
  </section>
</template>

<script setup>
// 판매처 > 연결 — 스마트스토어 카드 (2026-09-30 S3-2). 11번가 카드(StudioElevenstCard)와 같은 방식:
// 고객이 커머스API센터에서 만든 "내 스토어 애플리케이션" ID·시크릿 → 서버(api/marketplace.js connect_smartstore)가 중계 경유 인증 토큰 발급으로 확인 → 암호화 저장, 화면에는 ID 끝 4자리만.
// [연결하기]·[키 교체] = 작업 시작 관문(studioGate) — 로그인 전 → 로그인 창, 돌아오면 ?link=smartstore로 창을 이어서 연다 · 주문 없음 → 잠금 창
// 상품 보내기는 다음 작업 — 여기서는 연결까지만
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Store } from 'lucide-vue-next'
import StudioModal from '@/components/studio/StudioModal.vue'
import { currentUser } from '@/lib/auth'
import { studioGate } from '@/lib/studioGate'
import { connectSmartstore, disconnectSmartstore, fmtDate, isNotReady } from '@/lib/studioMarketplace'
import { smartstoreKeyProblems } from '@/lib/studioMarketplaceRules'
import { SMARTSTORE_GUIDE } from '@/lib/studioMarketGuides'
import { marketLinks, applyMarketLinks } from '@/lib/studioMarketLinks'

const route = useRoute()
const router = useRouter()
const linked = computed(() => marketLinks.smartstore?.connected === true)
const acc = computed(() => marketLinks.smartstore?.account || null)

const busy = ref('')
const msg = ref('')
const msgTone = ref('st-success-text font-bold')
const formOpen = ref(false)
const confirmOff = ref(false)
const form = ref({ clientId: '', clientSecret: '' })
const formTried = ref(false)
const formError = ref('')
const formSoft = ref(false)
const problems = computed(() => smartstoreKeyProblems(form.value))

async function start() {
  if (busy.value) return
  busy.value = 'gate'
  try {
    if (!(await studioGate('/studio/channels/connect?link=smartstore'))) return
    form.value = { clientId: '', clientSecret: '' }
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
    applyMarketLinks(await connectSmartstore({ client_id: form.value.clientId, client_secret: form.value.clientSecret }))
    form.value = { clientId: '', clientSecret: '' }
    formOpen.value = false
    msg.value = '스마트스토어가 연결됐어요.'
    msgTone.value = 'st-success-text font-bold'
  } catch (e) {
    console.error('[StudioSmartstoreCard] 스마트스토어 연결 실패:', e.code, e)
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
    applyMarketLinks(await disconnectSmartstore())
    msg.value = '스마트스토어 연결을 해제했어요.'
    msgTone.value = 'st-muted'
  } catch (e) {
    console.error('[StudioSmartstoreCard] 스마트스토어 연결 해제 실패:', e.code, e)
    msg.value = e.message
    msgTone.value = isNotReady(e.code) ? 'st-muted' : 'font-bold st-danger-text'
  } finally {
    busy.value = ''
  }
}

// 로그인 뒤 이어서 — ?link=smartstore (한 번 쓰고 주소에서 뗀다)
watch(() => [route.query.link, currentUser.value?.id], ([l, uid]) => {
  if (l !== 'smartstore' || !uid) return
  const { link, ...rest } = route.query
  router.replace({ query: rest })
  start()
}, { immediate: true })
// 로그아웃 — 열린 창·입력값을 비운다 (상태는 studioMarketLinks가 비운다)
watch(() => currentUser.value?.id, uid => { if (!uid) { formOpen.value = false; confirmOff.value = false; form.value = { clientId: '', clientSecret: '' }; msg.value = '' } })
</script>

<style scoped>
.guide-steps { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; background: var(--st-soft); }
.guide-steps li { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--st-ink); }
.guide-no { flex: none; width: 20px; height: 20px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; background: var(--st-accent); color: #fff; }
</style>
