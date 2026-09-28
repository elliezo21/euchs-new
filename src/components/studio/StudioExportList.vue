<template>
  <section data-export-list>
    <div class="flex items-center mb-4">
      <h2 class="st-h-section">내 상품</h2>
      <button v-if="items.length" type="button" class="ml-auto st-link-muted text-[13px]" data-export-list-reload @click="load">새로고침</button>
    </div>

    <p v-if="loading && !items.length" class="st-desc">불러오는 중…</p>
    <p v-else-if="errorMsg" class="text-[14px] font-bold st-danger-text break-keep" data-export-list-error>{{ errorMsg }}</p>
    <p v-else-if="!ready" class="st-desc break-keep" data-export-list-soon>잠시 후 다시 시도해 주세요.</p>
    <p v-else-if="!items.length" class="st-desc break-keep" data-export-list-empty>편집기에서 [작업 저장]이나 [다운로드]를 누르면 결과물이 여기에 보관돼요. 편집기를 다시 열지 않고 바로 받을 수 있어요.</p>

    <!-- 작은 카드 — 내 작업 목록과 같은 크기 (st-grid-compact) -->
    <div v-else class="st-grid-compact" data-export-grid>
      <article v-for="x in items" :key="x.id" class="min-w-0" :data-export-item="x.id">
        <div class="st-thumb-sq st-border st-placeholder">
          <img v-if="x.previewUrl" :src="x.previewUrl" alt="" loading="lazy" />
          <span v-else class="text-[11px]">미리보기 없음</span>
        </div>
        <div class="mt-1.5 space-y-1.5">
          <div class="text-[13px] font-bold st-ink truncate" :title="x.title || ''">{{ x.title || '이름 없는 작업' }}</div>
          <div class="st-desc-sm truncate" :title="dateLabel(x.createdAt) + ' · ' + kindLabel(x)">{{ x.count }}장 · {{ daysAgoLabel(x.createdAt) }}</div>
          <!-- 판매처 상태 — 이 내 상품으로 가장 최근에 보낸 것 (목록은 내 작업 화면의 [보낸 상품]과 같은 것) -->
          <!-- 판매처별 배지 줄 — 보낸 판매처마다 하나(안 보낸 판매처는 없음). 누르면 [보낸 상품]의 그 줄로 -->
          <div v-if="sendsOf[x.id]" class="flex flex-wrap items-center gap-1.5" data-export-send-badges>
            <template v-for="s in sendsOf[x.id]" :key="s.market">
              <button
                type="button" :class="SEND_BADGE_CLASS[s.status] || 'st-badge'" :title="badgeReason(s) || undefined"
                :data-export-send-badge="s.market" :data-export-send-status="s.status" @click="$emit('goto-send', s.id)"
              >{{ marketName(s.market) }} · {{ SEND_STATUS_LABEL[s.status] || s.status }}</button>
              <button v-if="badgeReason(s)" type="button" class="st-link text-[12px]" :data-export-send-reason="x.id" @click="reasonOf = s">사유 보기</button>
            </template>
          </div>
          <p v-if="x.count < x.planned" class="text-[11px] font-bold st-ai-text-soft break-keep">{{ x.planned }}장 중 {{ x.count }}장만 보관됐어요</p>
          <div class="flex flex-col gap-1">
            <button type="button" class="st-btn st-btn-primary st-btn-block ex-btn" :disabled="busy[x.id]?.running" :data-export-redownload="x.id" @click="redownload(x)">
              <Download class="w-3.5 h-3.5" :stroke-width="2" />
              {{ busy[x.id]?.running ? `받는 중 ${busy[x.id].done}/${busy[x.id].total || x.count}` : '다시 받기' }}
            </button>
            <!-- 판매처로 보내기 — 진입은 studioMarketplace.sendToMarketplace 한 곳 → 보내기 창(맨 위에서 보낼 판매처를 고른다) -->
            <button type="button" class="st-btn st-btn-block ex-btn" :disabled="busy[x.id]?.sending" :data-export-send="x.id" @click="send(x)">
              <Send class="w-3.5 h-3.5" :stroke-width="2" /> {{ busy[x.id]?.sending ? '확인 중…' : '판매처로 보내기' }}
            </button>
          </div>
          <p v-if="busy[x.id]?.message" class="text-[12px] font-bold break-keep" :class="busy[x.id].error ? 'st-danger-text' : 'st-muted'" :data-export-msg="x.id">{{ busy[x.id].message }}
            <router-link v-if="busy[x.id].link" :to="{ name: 'studio-settings-marketplace' }" class="st-link ml-1" :data-export-mk-link="x.id">설정 &gt; 판매처 연결로 가기</router-link>
          </p>
        </div>
      </article>
    </div>

    <StudioSendModal :open="sendOpen" :prepare="sendPrepare" @close="sendOpen = false" @sent="onSent" />

    <StudioModal :open="!!reasonOf" :title="reasonOf?.status === 'rejected' ? '반려 사유' : '보내지 못한 이유'" @close="reasonOf = null">
      <div class="space-y-2" data-export-reason-modal>
        <p class="text-[13px] font-bold st-ink break-keep">{{ reasonOf?.productName || '(상품명 없음)' }}</p>
        <p class="text-[13px] st-ink-2 break-keep whitespace-pre-line">{{ reasonOf?.reason }}</p>
        <p class="st-desc-sm break-keep">내용을 고친 뒤 [판매처로 보내기]로 다시 보낼 수 있어요.</p>
      </div>
      <template #actions>
        <button type="button" class="st-btn st-btn-primary" @click="reasonOf = null">확인</button>
      </template>
    </StudioModal>
  </section>
</template>

<script setup>
// 작업 홈 [내 상품] — [작업 저장]·[다운로드]로 만든 결과물을 보관한 목록 (studio_exports, api/studio-upload.js exports_list).
// [다시 받기] = 보관된 파일을 그대로 받는다(편집기를 열지 않는다). [판매처로 보내기] = 쿠팡 보내기 창(진입은 sendToMarketplace 한 곳).
// 판매처 상태 배지 = 부모가 넘겨 준 sends(StudioSendList가 읽은 목록)에서 내 상품마다 가장 최근 것.
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Download, Send } from 'lucide-vue-next'
import { listArchives, downloadArchive } from '@/lib/studioExportArchive'
import { sendToMarketplace, sendsByExport, badgeReason, SEND_STATUS_LABEL, SEND_BADGE_CLASS } from '@/lib/studioMarketplace'
import { MARKETS, withRo } from '@/lib/studioMarketplaceRules'
import { daysAgoLabel } from '@/lib/studioProjectList'
import StudioSendModal from '@/components/studio/StudioSendModal.vue'
import StudioModal from '@/components/studio/StudioModal.vue'

const props = defineProps({ sends: { type: Array, default: () => [] } })
const emit = defineEmits(['sent', 'goto-send', 'loaded'])
const sendsOf = computed(() => sendsByExport(props.sends))
const marketName = key => MARKETS.find(m => m.key === key)?.name || key
const reasonOf = ref(null)

const sendOpen = ref(false)
const sendPrepare = ref(null)
const sendingId = ref(null)

const items = ref([])
const ready = ref(true)
const loading = ref(false)
const errorMsg = ref('')
const busy = reactive({}) // id → { running, done, total, message, error }
let loadSeq = 0

function dateLabel(iso) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString() // KST
  return `${k.slice(0, 4)}.${k.slice(5, 7)}.${k.slice(8, 10)} ${k.slice(11, 16)}`
}
function kindLabel(x) {
  return `${x.mode === 'long' ? '한 장으로 길게' : `섹션별 ${x.count}장`} · ${x.format === 'png' ? 'PNG' : 'JPG'} · ${x.scale}배`
}

async function load() {
  const seq = ++loadSeq
  loading.value = true
  errorMsg.value = ''
  try {
    const r = await listArchives()
    if (seq !== loadSeq) return
    ready.value = r.ready === true
    items.value = r.items
    emit('loaded', r.items)
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('[StudioExportList] 내 상품 목록 조회 실패:', e.code, e)
    errorMsg.value = `내 상품을 불러오지 못했어요: ${e.message}`
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

async function redownload(x) {
  busy[x.id] = { running: true, done: 0, total: x.count, message: '', error: false }
  try {
    const n = await downloadArchive(x.id, (done, total) => { busy[x.id] = { ...busy[x.id], done, total } })
    busy[x.id] = { running: false, done: n, total: n, message: `${n}장을 받았어요`, error: false }
  } catch (e) {
    console.error('[StudioExportList] 다시 받기 실패:', x.id, e.code, e)
    busy[x.id] = { running: false, done: 0, total: 0, message: e.message, error: true }
  }
}

async function send(x) {
  const base = busy[x.id] || { running: false, done: 0, total: 0 }
  busy[x.id] = { ...base, sending: true, message: '', error: false, link: false }
  try {
    const r = await sendToMarketplace(x.id)
    if (r.status === 'ready') {
      sendingId.value = x.id
      sendPrepare.value = r.prepare
      sendOpen.value = true
      busy[x.id] = { ...base, sending: false, message: '', error: false, link: false }
    } else {
      busy[x.id] = { ...base, sending: false, message: r.message, error: false, link: true }
    }
  } catch (e) {
    console.error('[StudioExportList] 판매처로 보내기 준비 실패:', x.id, e.code, e)
    busy[x.id] = { ...base, sending: false, message: e.message, error: true, link: false }
  }
}
function onSent(r) {
  const id = sendingId.value
  if (id) busy[id] = { ...(busy[id] || { running: false, done: 0, total: 0 }), message: `${withRo(marketName(r?.market || 'coupang'))} 보냈어요${r?.sellerProductId ? ` (#${r.sellerProductId})` : ''}. 아래 [보낸 상품]에서 상태를 볼 수 있어요.`, error: false, link: false }
  emit('sent', r)
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 내 상품·서명 주소를 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    items.value = []
    emit('loaded', [])
    errorMsg.value = ''
    sendOpen.value = false
    sendPrepare.value = null
    reasonOf.value = null
    for (const k of Object.keys(busy)) delete busy[k]
  } else {
    load()
  }
}

onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  load()
})
onUnmounted(() => window.removeEventListener('euchs-auth-changed', onStudioAuthChanged))

defineExpose({ reload: load })
</script>

<style scoped>
.st-ai-text-soft { color: var(--st-ai); }
.ex-btn { height: 30px; padding: 0 8px; font-size: 12px; gap: 4px; white-space: nowrap; }
</style>
