<template>
  <section class="st-card p-5 sm:p-6" data-mk-card="zigzag">
    <div class="flex items-center gap-2">
      <span class="st-icon-box"><Store class="w-[18px] h-[18px]" :stroke-width="2" /></span>
      <h3 class="st-h-card">지그재그</h3>
      <span v-if="linked" class="st-badge st-badge-accent ml-auto" data-mk-zz-badge>{{ acc?.status === 'invalid' ? '키 확인 필요' : '연결됨' }}</span>
      <StudioLinkPending v-else-if="waiting" part="badge" :phase="phase" />
      <span v-else class="st-badge ml-auto">연결 전</span>
    </div>

    <div v-if="linked" class="mt-4 space-y-2 text-[13px]" data-mk-zz-connected>
      <div class="grid grid-cols-[92px_1fr] gap-y-1.5">
        <span class="st-muted">스토어</span><span class="st-ink font-bold">{{ acc.shop_name }}</span>
        <span class="st-muted">Access Key</span><span class="st-ink font-mono">•••• {{ acc.key_last4 }}</span>
        <span class="st-muted">마지막 확인</span><span class="st-ink">{{ fmtDate(acc.last_checked_at) }}</span>
      </div>
      <div class="flex flex-wrap gap-2 pt-1">
        <button type="button" class="st-btn" :disabled="!!busy" data-mk-zz-rekey @click="start">키 교체</button>
        <button type="button" class="st-btn st-btn-danger" :disabled="!!busy" data-mk-zz-disconnect @click="confirmOff = true">연결 해제</button>
      </div>
    </div>
    <StudioLinkPending v-else-if="waiting" :phase="phase" @retry="loadMarketLinks" />
    <div v-else class="mt-4 space-y-3">
      <p class="st-desc break-keep">지그재그 파트너센터에서 발급한 인증키를 입력하면 스튜디오와 연결됩니다. 키는 안전하게 보관하며 화면에 다시 표시하지 않습니다.</p>
      <button type="button" class="st-btn st-btn-primary" :disabled="!!busy" data-mk-zz-open @click="start">연결하기</button>
    </div>
    <p v-if="msg" class="mt-3 text-[13px] break-keep" :class="msgTone" data-mk-zz-msg>{{ msg }}</p>

    <!-- 연결 창 — 안내(해성이 준 글 그대로, 이미지 없음) + Access Key·Secret Key -->
    <StudioModal :open="formOpen" title="지그재그 연결" wide @close="formOpen = false">
      <form class="space-y-4" data-mk-zz-form @submit.prevent="submit">
        <div class="guide-box space-y-2" data-mk-zz-guide>
          <p class="text-[14px] font-bold st-ink">{{ ZIGZAG_GUIDE_TITLE }}</p>
          <p class="text-[13px] st-ink break-keep" data-mk-zz-guide-prep>{{ ZIGZAG_GUIDE_PREP }}</p>
          <ol class="guide-steps">
            <li v-for="(s, i) in ZIGZAG_GUIDE" :key="i"><span class="guide-no">{{ i + 1 }}</span><span class="flex-1 min-w-0 break-keep">{{ s }}</span></li>
          </ol>
          <p class="text-[13px] font-bold st-ink pt-1">{{ ZIGZAG_GUIDE_NOTES_TITLE }}</p>
          <ul class="text-[13px] st-ink space-y-0.5" data-mk-zz-guide-notes>
            <li v-for="(s, i) in ZIGZAG_GUIDE_NOTES" :key="i" class="break-keep">- {{ s }}</li>
          </ul>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block"><span class="st-label">Access Key *</span><input v-model.trim="form.accessKey" class="st-input w-full font-mono" maxlength="200" autocomplete="off" data-mk-zz-f-access /></label>
          <label class="block"><span class="st-label">Secret Key *</span><input v-model.trim="form.secretKey" type="password" class="st-input w-full font-mono" maxlength="200" autocomplete="new-password" data-mk-zz-f-secret /></label>
        </div>
        <p v-if="formTried && problems.length" class="text-[13px] font-bold st-danger-text" data-mk-zz-missing>입력을 확인하세요: {{ problems.join(', ') }}</p>
        <!-- 연결 실패 — 서버가 판매처 응답(errors.message)으로 나눈 문구: 키 오류 · 권한 부족(상품조회·상품갱신) · 입점 미완료 · 그 밖은 판매처 원문 -->
        <p v-if="formError" class="text-[13px] break-keep" :class="formSoft ? 'st-muted' : 'font-bold st-danger-text'" :data-mk-zz-error="formCode">{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="st-btn" @click="formOpen = false">취소</button>
          <button type="submit" class="st-btn st-btn-primary" :disabled="busy === 'connect'" data-mk-zz-submit>{{ busy === 'connect' ? '확인 중…' : '연결' }}</button>
        </div>
      </form>
    </StudioModal>

    <StudioModal :open="confirmOff" title="지그재그 연결을 해제하시겠습니까?" @close="confirmOff = false">
      저장된 인증키가 삭제됩니다. 다시 연결하려면 키를 새로 입력하세요.
      <template #actions>
        <button type="button" class="st-btn" @click="confirmOff = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" data-mk-zz-disconnect-confirm @click="disconnect">해제</button>
      </template>
    </StudioModal>
  </section>
</template>

<script setup>
// 판매처 > 연결 — 지그재그(카카오스타일) 카드 (2026-10-02). 11번가 카드와 같은 방식: 키는 서버(api/marketplace.js connect_zigzag)가 스토어 정보 조회로 확인한 뒤 암호화 저장, 화면에는 끝 4자리만.
// [연결하기]·[키 교체] = 작업 시작 관문(studioGate) — 로그인 전 → 로그인 창, 돌아오면 ?link=zigzag로 창을 이어서 연다 · 주문 없음 → 잠금 창
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Store } from 'lucide-vue-next'
import StudioModal from '@/components/studio/StudioModal.vue'
import { currentUser } from '@/lib/auth'
import { studioGate } from '@/lib/studioGate'
import { connectZigzag, disconnectZigzag, fmtDate, isNotReady } from '@/lib/studioMarketplace'
import { zigzagKeyProblems } from '../../../api/_zigzagFields.js'
import { ZIGZAG_GUIDE_TITLE, ZIGZAG_GUIDE_PREP, ZIGZAG_GUIDE, ZIGZAG_GUIDE_NOTES_TITLE, ZIGZAG_GUIDE_NOTES } from '@/lib/studioMarketGuides'
import { marketLinks, applyMarketLinks, marketLinksPhase, loadMarketLinks } from '@/lib/studioMarketLinks'
import StudioLinkPending from '@/components/studio/StudioLinkPending.vue'

const route = useRoute()
const router = useRouter()
const linked = computed(() => marketLinks.zigzag?.connected === true)
const phase = computed(() => marketLinksPhase.value)
const waiting = computed(() => phase.value === 'checking' || phase.value === 'failed')
const acc = computed(() => marketLinks.zigzag?.account || null)

const busy = ref('')
const msg = ref('')
const msgTone = ref('st-success-text font-bold')
const formOpen = ref(false)
const confirmOff = ref(false)
const form = ref({ accessKey: '', secretKey: '' })
const formTried = ref(false)
const formError = ref('')
const formCode = ref('')
const formSoft = ref(false)
const problems = computed(() => zigzagKeyProblems(form.value))

async function start() {
  if (busy.value) return
  busy.value = 'gate'
  try {
    if (!(await studioGate('/studio/channels/connect?link=zigzag'))) return
    form.value = { accessKey: '', secretKey: '' }
    formTried.value = false
    formError.value = ''
    formCode.value = ''
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
  formCode.value = ''
  try {
    applyMarketLinks(await connectZigzag({ access_key: form.value.accessKey, secret_key: form.value.secretKey }))
    form.value = { accessKey: '', secretKey: '' }
    formOpen.value = false
    msg.value = '지그재그가 연결되었습니다.'
    msgTone.value = 'st-success-text font-bold'
  } catch (e) {
    console.error('[StudioZigzagCard] 지그재그 연결 실패:', e.code, e)
    formError.value = e.message
    formCode.value = e.code || ''
    formSoft.value = isNotReady(e.code)
  } finally {
    busy.value = ''
  }
}
async function disconnect() {
  confirmOff.value = false
  busy.value = 'disconnect'
  try {
    applyMarketLinks(await disconnectZigzag())
    msg.value = '지그재그 연결이 해제되었습니다.'
    msgTone.value = 'st-muted'
  } catch (e) {
    console.error('[StudioZigzagCard] 지그재그 연결 해제 실패:', e.code, e)
    msg.value = e.message
    msgTone.value = isNotReady(e.code) ? 'st-muted' : 'font-bold st-danger-text'
  } finally {
    busy.value = ''
  }
}

// 로그인 뒤 이어서 — ?link=zigzag (한 번 쓰고 주소에서 뗀다)
watch(() => [route.query.link, currentUser.value?.id], ([l, uid]) => {
  if (l !== 'zigzag' || !uid) return
  const { link, ...rest } = route.query
  router.replace({ query: rest })
  start()
}, { immediate: true })
// 로그아웃 — 열린 창·입력값을 비운다 (상태는 studioMarketLinks가 비운다)
watch(() => currentUser.value?.id, uid => { if (!uid) { formOpen.value = false; confirmOff.value = false; form.value = { accessKey: '', secretKey: '' }; msg.value = '' } })
</script>

<style scoped>
/* 11번가 카드 안내와 같은 모양 */
.guide-box { padding: 14px; border-radius: 12px; background: var(--st-soft); }
.guide-steps { display: flex; flex-direction: column; gap: 8px; }
.guide-steps li { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--st-ink); }
.guide-no { flex: none; width: 20px; height: 20px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; background: var(--st-accent); color: #fff; }
</style>
