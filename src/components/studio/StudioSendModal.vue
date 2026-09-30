<template>
  <StudioModal :open="open" :title="prepare?.resend ? '고쳐서 다시 보내기' : '판매처로 보내기'" full @close="close">
    <div v-if="prepare" class="space-y-5 max-h-[70vh] overflow-y-auto pr-1" data-mk-send-modal>
      <p class="st-desc break-keep">내 상품 <b class="st-ink">{{ prepare.export.title || '이름 없는 작업' }}</b> ({{ prepare.export.files.length }}장)</p>
      <p v-if="prepare.resend" class="st-surface st-border rounded-[10px] p-3 text-[13px] break-keep" data-mk-s-resend-note><b class="st-ink">쿠팡 #{{ prepare.resend.sellerProductId }}</b> 을 고쳐서 다시 승인 요청해요. 새 상품은 만들지 않아요.<span v-if="prepare.resend.reason" class="block mt-1 st-danger-text">반려 사유: {{ prepare.resend.reason }}</span></p>

      <!-- 0. 보낼 판매처 -->
      <section class="space-y-2" data-mk-s-markets>
        <h4 class="st-h-card">0. 보낼 판매처 *</h4>
        <ul class="st-border rounded-[10px] st-divide overflow-hidden">
          <li v-for="r in rows" :key="r.key" class="market-row" :class="{ 'is-off': r.state !== 'connected' }" :data-mk-s-market="r.key" :data-mk-s-market-state="r.state">
            <label class="flex items-center gap-2.5 min-w-0 flex-1" :class="r.state === 'connected' ? 'cursor-pointer' : ''">
              <input v-model="checked[r.key]" type="checkbox" :disabled="r.state !== 'connected' || sending || allDone" :data-mk-s-market-check="r.key" />
              <span class="text-[14px] font-bold truncate" :class="r.state === 'connected' ? 'st-ink' : 'st-muted'">{{ r.name }}</span>
            </label>
            <template v-if="r.state === 'locked'">
              <Lock class="w-3.5 h-3.5 st-muted shrink-0" :stroke-width="2.2" aria-label="연결 전" />
              <router-link :to="{ name: 'studio-settings-marketplace' }" class="st-link text-[13px] shrink-0" :data-mk-s-market-connect="r.key" @click="$emit('close')">연결하기</router-link>
            </template>
            <span v-else-if="r.state === 'linked'" class="st-badge st-badge-accent shrink-0" :data-mk-s-market-linked="r.key">연결됨</span>
            <span v-else-if="r.state === 'planned'" class="st-badge shrink-0" :data-mk-s-market-planned="r.key">{{ PLANNED_LABEL }}</span>
          </li>
        </ul>
      </section>

      <!-- 판매처별 섹션 — 연결된 판매처마다 하나 만들어 두고, 체크된 것만 보인다(v-show).
           체크를 풀었다 다시 켜도 넣었던 값이 남는다(섹션을 없애지 않는다). 판매처가 늘면 SECTIONS에 컴포넌트를 더한다 -->
      <template v-for="key in mounted" :key="`${openSeq}:${key}`">
        <component :is="SECTIONS[key]" v-show="picked.includes(key)" :ref="el => setSection(key, el)" :prepare="prepare" :data-mk-s-section="key" />
      </template>

      <!-- 고른 판매처의 섹션을 그리지 못함 — 보내기를 막고 한 줄만 (원인은 콘솔) -->
      <p v-if="sectionFailed" class="text-[13px] font-bold st-danger-text" data-mk-s-section-error>잠시 후 다시 시도해 주세요.</p>

      <div v-else-if="missing.length && !allDone" class="st-surface st-border rounded-[10px] p-3" data-mk-s-missing>
        <div class="text-[13px] font-bold st-danger-text mb-1">채워야 보낼 수 있어요 ({{ missing.length }})</div>
        <ul class="text-[13px] st-danger-text space-y-0.5">
          <li v-for="m in missing" :key="m">· {{ m }}</li>
        </ul>
      </div>
    </div>
    <p v-else class="st-desc">불러오는 중…</p>
    <template #actions>
      <button type="button" class="st-btn" @click="close">{{ allDone ? '닫기' : '취소' }}</button>
      <button v-if="!allDone" type="button" class="st-btn st-btn-primary" :disabled="!canSend" data-mk-s-send @click="submit">{{ sending ? '보내는 중…' : buttonLabel }}</button>
    </template>
  </StudioModal>
</template>

<script setup>
// [판매처로 보내기] 창 — 맨 위 "0. 보낼 판매처"에서 고른 판매처의 섹션만 아래에 보이고(v-show — 값은 남는다), [보내기]는 체크된 판매처마다 그 섹션의 submit()을 부른다.
// 판매처 섹션 컴포넌트가 내놓는 것: missing(빠진 것)·busy·done·submit() — 지금은 쿠팡(StudioSendCoupang) 하나.
// 판매처 줄·처음 체크·버튼 글자는 studioMarketplaceRules.js (설정·랜딩과 같은 MARKETS 목록)
import { ref, reactive, computed, watch, shallowRef, onErrorCaptured } from 'vue'
import { Lock } from 'lucide-vue-next'
import StudioModal from '@/components/studio/StudioModal.vue'
import StudioSendCoupang from '@/components/studio/StudioSendCoupang.vue'
import { MARKETS, marketRows, defaultChecked, checkedMarkets, sectionKeys, sendActionLabel, PLANNED_LABEL } from '@/lib/studioMarketplaceRules'
import { linkStates } from '@/lib/studioMarketLinks'

const SECTIONS = { coupang: StudioSendCoupang }

const props = defineProps({ open: { type: Boolean, default: false }, prepare: { type: Object, default: null } })
const emit = defineEmits(['close', 'sent'])

const checked = ref({})
const sending = ref(false)
const openSeq = ref(0) // 창을 열 때마다 섹션을 새로 만든다
const sections = reactive({}) // key → 섹션 인스턴스
const results = shallowRef({}) // key → 보낸 결과

// 쿠팡 = 서버 send_prepare.markets, 스마트스토어·11번가·카페24 = 연결 탭과 같은 상태(studioMarketLinks — 보내기는 아직이라 "연결됨"만), 나머지 = "예정"
const rows = computed(() => marketRows({ ...linkStates(false), ...(props.prepare?.markets || {}) }))
const picked = computed(() => checkedMarkets(rows.value, checked.value))
const mounted = computed(() => sectionKeys(rows.value, Object.keys(SECTIONS))) // 섹션을 만들어 둘 판매처 (체크와 상관없음)
const nameOf = key => MARKETS.find(m => m.key === key)?.name || key
function setSection(key, el) {
  if (el) sections[key] = el
  else delete sections[key]
}

watch(() => props.open, v => {
  if (!v) return
  openSeq.value++
  sectionError.value = false
  sending.value = false
  results.value = {}
  for (const k of Object.keys(sections)) delete sections[k]
  checked.value = defaultChecked(rows.value)
})

const missing = computed(() => {
  if (!picked.value.length) return ['보낼 판매처']
  const out = []
  for (const key of picked.value) {
    const list = sections[key]?.missing || []
    for (const m of list) out.push(picked.value.length > 1 ? `${nameOf(key)} · ${m}` : m)
  }
  return out
})
// 재발 방지 (2026-09-28 운영 버그: 섹션 setup이 죽었는데 [보내기]가 켜져 있었다)
//   고른 판매처마다 섹션이 실제로 떠 있어야(sections[key]) 보낼 수 있다. 준비 데이터가 없거나 섹션이 없으면 버튼을 끈다.
const sectionError = ref(false)
onErrorCaptured((err, instance, info) => {
  console.error('[StudioSendModal] 판매처 섹션 오류 — 보내기를 막음:', info, err)
  sectionError.value = true
  return false // 창 전체가 죽지 않게 여기서 멈춘다 (화면에는 "잠시 후 다시 시도해 주세요."만)
})
const sectionsReady = computed(() => picked.value.length > 0 && picked.value.every(key => !!SECTIONS[key] && !!sections[key]))
const sectionFailed = computed(() => sectionError.value || (picked.value.length > 0 && !sectionsReady.value))
const canSend = computed(() => !!props.prepare && sectionsReady.value && !sectionError.value && !sending.value && !sectionBusy.value && missing.value.length === 0)
const sectionBusy = computed(() => picked.value.some(key => !!sections[key]?.busy))
const allDone = computed(() => picked.value.length > 0 && picked.value.every(key => !!sections[key]?.done))
const buttonLabel = computed(() => sendActionLabel(picked.value, !!props.prepare?.resend))

async function submit() {
  if (!canSend.value) return
  sending.value = true
  try {
    for (const key of picked.value) {
      const s = sections[key]
      if (!s || s.done) continue
      const r = await s.submit() // 못 보낸 이유는 그 섹션 안에 보인다 — 다른 판매처는 계속 보낸다
      if (r) {
        results.value = { ...results.value, [key]: r }
        emit('sent', { market: key, ...r })
      }
    }
  } finally {
    sending.value = false
  }
}
function close() {
  if (sending.value) return
  emit('close')
}
</script>

<style scoped>
.market-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--st-surface); }
.market-row.is-off { background: var(--st-soft); }
</style>
