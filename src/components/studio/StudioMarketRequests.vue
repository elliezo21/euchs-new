<template>
  <section class="st-card p-5 sm:p-6 space-y-3" data-mk-card="others">
    <h3 class="st-h-card">다른 판매처</h3>
    <p class="st-desc break-keep">판매자 ID와 연락처를 남겨 주시면 연결해 드려요.</p>
    <ul class="st-border rounded-[10px] st-divide overflow-hidden">
      <li v-for="m in REQUEST_LIST" :key="m.key" class="req-row" :data-mk-other="m.key" :data-mk-other-state="stateOf(m.key)">
        <span class="text-[14px] font-bold st-ink truncate">{{ m.name }}</span>
        <span class="flex-1" />
        <template v-if="stateOf(m.key) === 'connected'">
          <span class="st-badge st-badge-ok shrink-0">연결됨</span>
        </template>
        <template v-else-if="stateOf(m.key) === 'requested'">
          <span class="text-[12px] st-muted shrink-0 break-keep" data-mk-other-requested>신청 접수됨 — 연결되면 알려드려요</span>
        </template>
        <button v-else type="button" class="st-btn req-btn shrink-0" :disabled="!!busy" :data-mk-other-request="m.key" @click="start(m)">연결 신청</button>
      </li>
    </ul>
    <p v-if="msg" class="text-[13px] break-keep" :class="msgTone" data-mk-other-msg>{{ msg }}</p>

    <!-- 신청 창 — 가이드 + 판매자 ID·담당자 연락처 -->
    <StudioModal :open="!!target" :title="target ? `${target.name} 연결 신청` : ''" wide @close="target = null">
      <form v-if="target" class="space-y-4" data-mk-req-form @submit.prevent="submit">
        <ol class="guide-steps" data-mk-req-guide>
          <li v-for="(s, i) in requestGuide(target.key, target.name)" :key="i"><span class="guide-no">{{ i + 1 }}</span><span class="break-keep">{{ s }}</span></li>
        </ol>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block"><span class="st-label">판매자 ID *</span><input v-model.trim="form.sellerId" class="st-input w-full" maxlength="100" autocomplete="off" data-mk-req-f-id /></label>
          <label class="block"><span class="st-label">담당자 연락처 *</span><input v-model.trim="form.contact" class="st-input w-full" maxlength="20" inputmode="tel" placeholder="010-1234-5678" data-mk-req-f-contact /></label>
        </div>
        <p v-if="tried && problems.length" class="text-[13px] font-bold st-danger-text" data-mk-req-missing>확인해 주세요: {{ problems.join(', ') }}</p>
        <p v-if="formError" class="text-[13px] break-keep" :class="formSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-req-error>{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="st-btn" @click="target = null">취소</button>
          <button type="submit" class="st-btn st-btn-primary" :disabled="busy === 'send'" data-mk-req-submit>{{ busy === 'send' ? '보내는 중…' : '신청하기' }}</button>
        </div>
      </form>
    </StudioModal>
  </section>
</template>

<script setup>
// 판매처 > 연결 — [연결 신청] 목록 (2026-09-30). 지그재그·에이블리·스마트스토어·G마켓·카페24·메이크샵·고도몰 — "준비 중" 배지 대신 [연결 신청]으로 통일.
// 신청은 서버(api/marketplace.js connect_request → marketplace_requests)에 저장 — 관리자가 보고 연결한 뒤 알린다.
// [연결 신청] = 작업 시작 관문(studioGate) — 로그인 전 → 로그인 창, 돌아오면 ?request=<key>로 창을 이어서 연다 · 주문 없음 → 잠금 창
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StudioModal from '@/components/studio/StudioModal.vue'
import { currentUser } from '@/lib/auth'
import { studioGate } from '@/lib/studioGate'
import { requestConnect, isNotReady } from '@/lib/studioMarketplace'
import { MARKETS, requestProblems } from '@/lib/studioMarketplaceRules'
import { requestGuide } from '@/lib/studioMarketGuides'
import { marketLinks, applyMarketLinks } from '@/lib/studioMarketLinks'

const REQUEST_LIST = MARKETS.filter(m => m.connect === 'request') // 랜딩 칩·보내기 탭과 같은 목록·순서
const route = useRoute()
const router = useRouter()
const stateOf = key => { const s = marketLinks.requests?.[key]?.status; return s === 'connected' ? 'connected' : s === 'requested' ? 'requested' : 'none' }

const busy = ref('')
const msg = ref('')
const msgTone = ref('st-success-text font-bold')
const target = ref(null)
const form = ref({ sellerId: '', contact: '' })
const tried = ref(false)
const formError = ref('')
const formSoft = ref(false)
const problems = computed(() => requestProblems(form.value))

async function start(m) {
  if (busy.value) return
  busy.value = 'gate'
  try {
    if (!(await studioGate(`/studio/channels/connect?request=${encodeURIComponent(m.key)}`))) return
    form.value = { sellerId: '', contact: '' }
    tried.value = false
    formError.value = ''
    target.value = m
  } finally {
    busy.value = ''
  }
}
async function submit() {
  tried.value = true
  if (problems.value.length || !target.value) return
  busy.value = 'send'
  formError.value = ''
  const m = target.value
  try {
    applyMarketLinks(await requestConnect({ market: m.key, seller_id: form.value.sellerId, contact: form.value.contact }))
    target.value = null
    msg.value = `${m.name} 연결 신청을 받았어요. 연결되면 알려드려요.`
    msgTone.value = 'st-success-text font-bold'
  } catch (e) {
    console.error('[StudioMarketRequests] 연결 신청 실패:', m.key, e.code, e)
    formError.value = e.message
    formSoft.value = isNotReady(e.code)
  } finally {
    busy.value = ''
  }
}

// 로그인 뒤 이어서 — ?request=<key> (한 번 쓰고 주소에서 뗀다)
watch(() => [route.query.request, currentUser.value?.id], ([k, uid]) => {
  if (typeof k !== 'string' || !k || !uid) return
  const { request, ...rest } = route.query
  router.replace({ query: rest })
  const m = REQUEST_LIST.find(x => x.key === k)
  if (m) start(m)
  else console.warn('[StudioMarketRequests] 이어서 신청할 판매처가 없음:', request)
}, { immediate: true })
watch(() => currentUser.value?.id, uid => { if (!uid) { target.value = null; form.value = { sellerId: '', contact: '' }; msg.value = '' } })
</script>

<style scoped>
.req-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--st-surface); min-height: 50px; }
.req-btn { height: 32px; padding: 0 12px; font-size: 13px; }
.guide-steps { display: flex; flex-direction: column; gap: 8px; padding: 14px; border-radius: 12px; background: var(--st-soft); }
.guide-steps li { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--st-ink); }
.guide-no { flex: none; width: 20px; height: 20px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; background: var(--st-accent); color: #fff; }
</style>
