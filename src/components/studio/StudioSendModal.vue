<template>
  <StudioModal :open="open" :title="prepare?.resend ? '수정 후 다시 보내기' : '판매처로 보내기'" full @close="close">
    <div v-if="prepare" class="space-y-5 max-h-[70vh] overflow-y-auto pr-1" data-mk-send-modal>
      <p class="st-desc break-keep">상품 <b class="st-ink">{{ prepare.export.projectTitle || prepare.export.title || '이름 없는 상품' }}</b> · 이미지 {{ prepare.export.files.length }}장</p>
      <p v-if="prepare.resend" class="st-surface st-border rounded-[10px] p-3 text-[13px] break-keep" data-mk-s-resend-note>쿠팡 상품번호 <b class="st-ink">{{ prepare.resend.sellerProductId }}</b> 을 수정하여 다시 승인 요청합니다. 새 상품은 생성되지 않습니다.<span v-if="prepare.resend.reason" class="block mt-1 st-danger-text">반려 사유: {{ prepare.resend.reason }}</span></p>

      <!-- 0. 보낼 판매처 -->
      <section class="space-y-2" data-mk-s-markets>
        <h4 class="st-h-card">판매처 *</h4>
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
            <!-- 이 상품이 이미 전송된 판매처 — 상태만 표시. [일괄 전송]이면 처음 체크에서 빠지고, 판매처 버튼([○○로 보내기])으로 열면 체크된 채
                 아래 "판매처에 있는 상품을 수정합니다" 안내가 보인다(2026-10-02 다시 보내기 = 수정) -->
            <!-- 이번 [보내기]에서 실패한 판매처 (2026-10-02) — 보내기 전 검사에서 막혀 전송 기록이 없는 실패도 여기서 "실패"로 보인다. 사유는 결과 표·그 판매처 칸 -->
            <span v-if="failedNow(r.key)" :class="SEND_BADGE_CLASS.failed" class="shrink-0" :data-mk-s-market-failed="r.key">{{ sendStatusLabel('failed') }}</span>
            <span v-else-if="sentMap[r.key]" :class="SEND_BADGE_CLASS[sentMap[r.key].status] || 'st-badge'" class="shrink-0" :data-mk-s-market-sent="r.key">{{ sendStatusLabel(sentMap[r.key].status) }}</span>
          </li>
        </ul>
        <!-- 이미 판매처에 있는 상품 (2026-10-02 — 예전 "중복 등록" 확인을 걷어냄): 체크한 판매처마다 한 줄.
             수정 = 새 상품을 만들지 않고 그 상품을 수정 · 수정 API가 없는 판매처 = 판매처에서 직접 수정(빠짐 목록에 올라 보내기가 꺼진다) -->
        <div v-for="n in existingNotes" :key="n.key" class="st-surface st-border rounded-[10px] p-3 space-y-0.5" :data-mk-s-existing="n.key" :data-mk-s-existing-mode="n.mode">
          <p v-for="(line, i) in n.lines" :key="i" class="text-[13px] break-keep" :class="n.mode === 'manual' ? 'st-danger-text font-bold' : 'st-ink'"><template v-if="i === 0"><b>{{ nameOf(n.key) }}</b> · </template>{{ line }}<template v-if="i === 0 && n.mode === 'modify'"> (상품번호 {{ existing[n.key].sellerProductId }})</template></p>
        </div>
      </section>

      <!-- 판매처별 섹션 — 연결된 판매처마다 하나 만들어 두고, 체크된 것만 보인다(v-show).
           체크를 풀었다 다시 켜도 넣었던 값이 남는다(섹션을 없애지 않는다). 판매처가 늘면 SECTIONS에 컴포넌트를 더한다 -->
      <!-- 공통 정보 (2026-10-01) — 스마트스토어·11번가를 함께 체크했을 때만. 그 두 섹션은 이 값을 자기 칸에 옮겨 담는다(commonPatch). 쿠팡은 자기 칸 그대로 -->
      <StudioSendCommon v-if="useCommon" :key="`common:${openSeq}`" :common="common" :prepare="prepare" :markets="commonMarkets(picked)" :coupang="picked.includes('coupang')" :disabled="sending" />

      <template v-for="key in mounted" :key="`${openSeq}:${key}`">
        <component :is="SECTIONS[key]" v-show="picked.includes(key)" :ref="el => setSection(key, el)" :prepare="prepare" v-bind="COMMON_MARKETS.includes(key) ? { common: useCommon ? common : null } : {}" :data-mk-s-section="key" />
      </template>

      <!-- 고른 판매처의 섹션을 그리지 못함 — 보내기를 막고 한 줄만 (원인은 콘솔) -->
      <p v-if="sectionFailed" class="text-[13px] font-bold st-danger-text" data-mk-s-section-error>잠시 후 다시 시도해 주세요.</p>

      <div v-else-if="missing.length && !allDone" class="st-surface st-border rounded-[10px] p-3" data-mk-s-missing>
        <div class="text-[13px] font-bold st-danger-text mb-1">입력이 필요한 항목 ({{ missing.length }})</div>
        <ul class="text-[13px] st-danger-text space-y-0.5">
          <li v-for="m in missing" :key="m">· {{ m }}</li>
        </ul>
      </div>

      <!-- 전송 결과 (2026-10-01) — 판매처 2곳 이상을 한 번에 보냈을 때만. 1곳이면 예전처럼 그 섹션 안에만 보인다 -->
      <section v-if="resultRows.length" class="space-y-2" data-mk-s-results>
        <h4 class="st-h-card">전송 결과</h4>
        <ul class="st-border rounded-[10px] st-divide overflow-hidden">
          <li v-for="r in resultRows" :key="r.key" class="market-row" :data-mk-s-result="r.key" :data-mk-s-result-state="r.state">
            <span class="text-[14px] font-bold st-ink shrink-0 w-[96px] truncate">{{ r.name }}</span>
            <span :class="r.state === 'wait' ? 'st-badge' : SEND_BADGE_CLASS[r.status] || 'st-badge'" class="shrink-0">{{ r.state === 'wait' ? (sections[r.key]?.busy === 'send' ? sendStatusLabel('sending') : RESULT_WAIT_LABEL) : sendStatusLabel(r.status) }}</span>
            <span v-if="r.state === 'ok'" class="text-[13px] st-ink min-w-0 break-all" :data-mk-s-result-id="r.key">상품번호 {{ r.id }}</span>
            <span v-else-if="r.state === 'fail'" class="text-[13px] st-danger-text min-w-0 break-keep" :data-mk-s-result-reason="r.key">{{ r.reason }}</span>
          </li>
        </ul>
        <p v-if="failedKeys.length" class="st-desc-sm break-keep" data-mk-s-results-retry-note>[{{ RETRY_FAILED_LABEL }}]은 등록 완료된 판매처를 제외하고 실패한 판매처만 재전송합니다. 아래 판매처 칸에서 실패 사유를 수정한 뒤 진행합니다.</p>
      </section>
    </div>
    <!-- 준비 데이터(send_prepare)를 받는 동안 — 창은 먼저 열고 여기서 진행 상태를 보인다 (2026-09-30: 받는 동안 버튼에 "여는 중…"만 10초 넘게 떠 있었다).
         '준비 중'은 이 창에서 쓰지 않는 글자(아직 없는 기능 표시와 헷갈림 — S3-3)라 "불러오는 중" -->
    <div v-else-if="loadError" class="space-y-2" data-mk-s-load-error>
      <p class="text-[13px] font-bold st-danger-text break-keep">{{ loadError }}</p>
      <button type="button" class="st-btn" data-mk-s-load-retry @click="$emit('retry')">다시 시도</button>
    </div>
    <div v-else class="space-y-3" data-mk-s-loading aria-busy="true">
      <p class="text-[14px] font-bold st-ink" data-mk-s-progress>{{ progress || '상품 정보 불러오는 중…' }}</p>
      <p class="st-desc-sm break-keep">{{ progress ? '작업을 바꾼 뒤 처음 보낼 때만 상세 이미지를 새로 만들어요' : '상품 이미지 · 배송 설정 · 판매처 연결 상태 확인 중' }}</p>
      <div class="st-skeleton h-9 rounded-[10px]" />
      <div class="st-skeleton h-24 rounded-[10px]" />
      <div class="st-skeleton h-9 w-2/3 rounded-[10px]" />
    </div>
    <template #actions>
      <button type="button" class="st-btn" @click="close">{{ allDone ? '닫기' : '취소' }}</button>
      <button v-if="!allDone" type="button" class="st-btn st-btn-primary" :disabled="!canSend" data-mk-s-send @click="submit">{{ sending ? '전송 중…' : buttonLabel }}</button>
    </template>
  </StudioModal>
</template>

<script setup>
// [판매처로 보내기] 창 — 맨 위 "0. 보낼 판매처"에서 고른 판매처의 섹션만 아래에 보이고(v-show — 값은 남는다), [보내기]는 체크된 판매처마다 그 섹션의 submit()을 부른다.
// 판매처 섹션 컴포넌트가 내놓는 것: missing(빠진 것)·busy·done·submit() — 쿠팡(StudioSendCoupang)·스마트스토어(StudioSendSmartstore)·11번가(StudioSendElevenst)·카페24(StudioSendCafe24)·지그재그(StudioSendZigzag).
// 판매처 줄·처음 체크·버튼 글자는 studioMarketplaceRules.js (설정·랜딩과 같은 MARKETS 목록)
import { ref, reactive, computed, watch, shallowRef, onErrorCaptured, provide, onMounted, onUnmounted } from 'vue'
import { Lock } from 'lucide-vue-next'
import StudioModal from '@/components/studio/StudioModal.vue'
import StudioSendCoupang from '@/components/studio/StudioSendCoupang.vue'
import StudioSendCafe24 from '@/components/studio/StudioSendCafe24.vue'
import StudioSendSmartstore from '@/components/studio/StudioSendSmartstore.vue'
import StudioSendElevenst from '@/components/studio/StudioSendElevenst.vue'
import StudioSendZigzag from '@/components/studio/StudioSendZigzag.vue'
import StudioSendCommon from '@/components/studio/StudioSendCommon.vue'
import { COMMON_MARKETS, commonMarkets, commonActive, commonFromPrepare } from '@/lib/studioSendCommon'
import { MARKETS, marketRows, initialChecked, checkedMarkets, sectionKeys, bulkSendLabel, sendResultRows, alreadySent, existingNote, manualEditKeys, manualEditMissing, sendStatusLabel, RESULT_WAIT_LABEL, RETRY_FAILED_LABEL, SEND_BADGE_CLASS, PLANNED_LABEL, SEND_CACHE_KEY } from '@/lib/studioMarketplaceRules'
import { linkStates } from '@/lib/studioMarketLinks'
import { detailImageOver, detailImageMissing } from '../../../api/_marketDetailLimits.js'
import { isAdminOrStaff, currentUser } from '@/lib/auth'
import { readDraft, writeDraft, commonDraft, applyCommonDraft } from '@/lib/studioSendDraft'
import { repImageCandidates } from '@/lib/studioMarketplaceRules'

const SECTIONS = { coupang: StudioSendCoupang, smartstore: StudioSendSmartstore, '11st': StudioSendElevenst, cafe24: StudioSendCafe24, zigzag: StudioSendZigzag } // 2026-09-30 카페24 · 2026-10-01 스마트스토어·11번가 · 2026-10-02 지그재그 섹션 추가 — 쿠팡 섹션은 그대로

// market = 어느 판매처 버튼으로 열었는지([쿠팡으로 보내기]·[카페24로 보내기]) → 그 판매처만 처음 체크. 비면 연결된 곳 모두(다시 보내기는 쿠팡만)
// prepare = null이면 준비 중(창은 먼저 열린다) · loadError = 준비를 못 받음 → [다시 시도] = 'retry'
// sent = 이 내 상품의 판매처별 가장 최근 전송(sendsByExport) — "이미 보냄" 표시용. 안 넘기면(다시 보내기 창) 예전 그대로
// progress = 준비 중 진행 문구(상세 이미지를 새로 만들 때 "상세 이미지 만드는 중 3 / 11" — studioProductImages.renderProgressText). 비면 예전 문구
const props = defineProps({ open: { type: Boolean, default: false }, prepare: { type: Object, default: null }, market: { type: String, default: '' }, loadError: { type: String, default: '' }, sent: { type: Array, default: () => [] }, progress: { type: String, default: '' } })
const emit = defineEmits(['close', 'sent', 'retry'])

// 같은 화면 안에서 창을 다시 열 때 다시 받지 않는 목록 (지금은 카페24 상품 분류 — StudioSendCafe24가 inject).
// 창 컴포넌트는 화면이 떠 있는 동안 남아 있다 → 화면을 떠나면(연결 탭 등) 비워진다. 로그인 바뀜·로그아웃이면 비운다
const sendCache = {}
provide(SEND_CACHE_KEY, sendCache)
const clearSendCache = () => { for (const k of Object.keys(sendCache)) delete sendCache[k] }
onMounted(() => window.addEventListener('euchs-auth-changed', clearSendCache))
onUnmounted(() => window.removeEventListener('euchs-auth-changed', clearSendCache))

const checked = ref({})
const sending = ref(false)
const openSeq = ref(0) // 창을 열 때마다 섹션을 새로 만든다
const sections = reactive({}) // key → 섹션 인스턴스
const results = shallowRef({}) // key → { ok, id, status } | { ok:false, reason } (sendResultRows)
const runKeys = ref([]) // 마지막 [보내기] 때 체크된 판매처 — 2곳 이상이면 결과 표를 그린다

// 쿠팡 = 서버 send_prepare.markets, 스마트스토어·11번가·카페24 = 연결 탭과 같은 상태(studioMarketLinks), 나머지 = "예정"
const rows = computed(() => marketRows({ ...linkStates(false), ...(props.prepare?.markets || {}) }, { admin: isAdminOrStaff.value })) // 보이는 판매처는 marketsFor 한 곳 (카페24 = 운영 중단 off — 줄 없음)
const picked = computed(() => checkedMarkets(rows.value, checked.value))
const mounted = computed(() => sectionKeys(rows.value, Object.keys(SECTIONS))) // 섹션을 만들어 둘 판매처 (체크와 상관없음)
const nameOf = key => MARKETS.find(m => m.key === key)?.name || key
// 이미 보낸 판매처 — 다시 보내기 창에서는 쓰지 않는다(반려된 쿠팡 상품을 고치는 길)
const sentMap = computed(() => (props.prepare?.resend ? {} : alreadySent(props.sent)))
// 판매처에 이미 있는 상품 (서버 send_prepare.existing — 규칙 api/_marketUpdate.js). 다시 보내기 창(쿠팡 반려 고치기)은 자기 안내가 따로 있다
const existing = computed(() => (props.prepare?.resend ? {} : props.prepare?.existing || {}))
const doneKeys = computed(() => picked.value.filter(k => !!sections[k]?.done))
const existingNotes = computed(() => picked.value.filter(k => !doneKeys.value.includes(k)).map(k => ({ key: k, ...existingNote(k, existing.value) })).filter(n => n.mode))
const manualKeys = computed(() => manualEditKeys(picked.value, existing.value, doneKeys.value))
// 공통 정보 — 창을 열 때(준비 데이터가 올 때) 새로 만든다. 스마트스토어·11번가를 함께 체크했고 다시 보내기가 아닐 때만 쓴다(commonActive)
const common = ref(null)
const useCommon = computed(() => !!common.value && commonActive(picked.value, { resend: !!props.prepare?.resend }))
// 입력값 기억 (2026-10-02 — src/lib/studioSendDraft.js): [보내기]를 누를 때 이 브라우저에 남기고, 같은 상품을 다시 열면 되살린다
//   공통 정보는 창을 열 때 바로 덮고, 판매처 칸은 그 섹션이 화면에 붙을 때 한 번(applyDraft — 카테고리는 목록이 온 뒤 골라진다)
let pendingDraft = {}
function draftStorage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null } catch (e) { console.warn('[StudioSendModal] 브라우저 저장소를 쓸 수 없음 — 입력값을 기억하지 않음:', e?.message); return null }
}
function setSection(key, el) {
  if (el) {
    sections[key] = el
    const d = pendingDraft[key]
    if (d && typeof el.applyDraft === 'function') { delete pendingDraft[key]; el.applyDraft(d) }
  } else delete sections[key]
}
function rememberInputs(keys) {
  const uid = currentUser.value?.id, exportId = props.prepare?.export?.id
  if (!uid || !exportId || props.prepare?.resend) return
  const store = draftStorage()
  const prev = readDraft(store, uid, exportId)
  const secs = { ...(prev?.sections || {}) }
  for (const k of keys) { const out = sections[k]?.draftOut?.(); if (out) secs[k] = out }
  writeDraft(store, uid, exportId, { common: useCommon.value ? commonDraft(common.value) : prev?.common || null, sections: secs })
}

// 창을 열 때, 그리고 창이 열린 뒤 준비 데이터가 도착할 때 — 섹션을 새로 만들고 처음 체크를 정한다
// (처음 체크는 prepare.markets를 보므로 준비 데이터가 온 뒤에 정해야 한다)
function resetForPrepare() {
  openSeq.value++
  sectionError.value = false
  sending.value = false
  results.value = {}
  runKeys.value = []
  common.value = props.prepare ? commonFromPrepare(props.prepare) : null
  pendingDraft = {}
  if (props.prepare && !props.prepare.resend) {
    const d = readDraft(draftStorage(), currentUser.value?.id, props.prepare.export?.id)
    if (d) {
      if (d.common && common.value) applyCommonDraft(common.value, d.common, repImageCandidates(props.prepare.images).map(im => im.id))
      pendingDraft = { ...d.sections }
    }
  }
  for (const k of Object.keys(sections)) delete sections[k]
  checked.value = props.prepare ? initialChecked(rows.value, { market: props.market, resend: !!props.prepare.resend, sent: sentMap.value }) : {}
}
watch(() => props.open, v => { if (v) resetForPrepare() })
watch(() => props.prepare, (p, old) => { if (props.open && p && p !== old) resetForPrepare() })

const missing = computed(() => {
  if (!picked.value.length) return ['판매처']
  const out = []
  for (const key of picked.value) {
    const list = sections[key]?.missing || []
    for (const m of list) out.push(picked.value.length > 1 ? `${nameOf(key)} · ${m}` : m)
    // 판매처별 상세 이미지 장 수 (api/_marketDetailLimits.js — 서버와 같은 규칙). 어느 판매처인지 늘 앞에 붙인다
    const count = props.prepare?.export?.files?.length ?? 0
    const over = sections[key]?.done ? null : detailImageOver(key, count)
    if (over) out.push(`${nameOf(key)} · ${detailImageMissing(count, over)}`)
  }
  for (const key of manualKeys.value) out.push(manualEditMissing(nameOf(key)))
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
// 체크된 판매처 중 지난 [보내기]에서 실패하고 아직 등록 안 된 곳 → 버튼 [실패 건 재전송]
const failedKeys = computed(() => picked.value.filter(k => results.value[k] && !results.value[k].ok && !sections[k]?.done))
// 맨 위 판매처 줄 배지 — 이번 창에서 보냈다가 실패했고 아직 등록 안 된 곳 (체크를 풀어도 결과는 보인다)
const failedNow = key => !!results.value[key] && !results.value[key].ok && !sections[key]?.done
const resultRows = computed(() => (runKeys.value.length > 1 ? sendResultRows(runKeys.value, results.value) : []))
const buttonLabel = computed(() => bulkSendLabel(picked.value, failedKeys.value, !!props.prepare?.resend, existing.value, doneKeys.value))

async function submit() {
  if (!canSend.value) return
  sending.value = true
  // 이번에 보낼 곳 = 체크됐고 아직 등록 안 된 곳. 등록된 곳(done)은 건너뛴다 → 다시 누르면 실패한 곳만 다시 보낸다
  const keys = picked.value.filter(k => !sections[k]?.done)
  rememberInputs(keys) // 실패해도 다시 열면 같은 값 (2026-10-02)
  runKeys.value = picked.value.length > 1 ? [...picked.value] : []
  results.value = Object.fromEntries(Object.entries(results.value).filter(([k]) => !keys.includes(k)))
  try {
    for (const key of keys) {
      const s = sections[key]
      if (!s) continue
      const r = await s.submit() // 못 보낸 이유는 그 섹션 안에 보인다 — 다른 판매처는 계속 보낸다
      if (r) {
        results.value = { ...results.value, [key]: { ok: true, id: r.sellerProductId, status: r.status } }
        emit('sent', { market: key, ...r })
      } else {
        results.value = { ...results.value, [key]: { ok: false, reason: s.sendError } }
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
