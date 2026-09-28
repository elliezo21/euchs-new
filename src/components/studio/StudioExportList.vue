<template>
  <section data-export-list>
    <div class="flex items-center mb-4">
      <h2 class="st-h-section">완성작</h2>
      <button v-if="items.length" type="button" class="ml-auto st-link-muted text-[13px]" data-export-list-reload @click="load">새로고침</button>
    </div>

    <p v-if="loading && !items.length" class="st-desc">불러오는 중…</p>
    <p v-else-if="errorMsg" class="text-[14px] font-bold st-danger-text break-keep" data-export-list-error>{{ errorMsg }}</p>
    <p v-else-if="!ready" class="st-desc break-keep" data-export-list-soon>완성작 보관을 준비하고 있어요. 곧 내보낸 이미지를 여기서 다시 받을 수 있어요.</p>
    <p v-else-if="!items.length" class="st-desc break-keep" data-export-list-empty>편집기에서 [내보내기]로 받은 이미지가 여기에 보관돼요. 편집기를 다시 열지 않고 바로 받을 수 있어요.</p>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <article v-for="x in items" :key="x.id" class="min-w-0 st-card overflow-hidden" :data-export-item="x.id">
        <div class="h-[180px] overflow-hidden st-placeholder">
          <img v-if="x.previewUrl" :src="x.previewUrl" alt="" class="w-full h-full object-cover object-top" />
          <span v-else class="text-[13px]">미리보기 없음</span>
        </div>
        <div class="p-3.5 space-y-2">
          <div class="text-[14px] font-bold st-ink truncate" :title="x.title || ''">{{ x.title || '이름 없는 작업' }}</div>
          <div class="st-desc-sm">{{ dateLabel(x.createdAt) }} · {{ kindLabel(x) }}</div>
          <p v-if="x.count < x.planned" class="text-[11px] font-bold st-ai-text-soft break-keep">{{ x.planned }}장 중 {{ x.count }}장만 보관됐어요</p>
          <div class="flex flex-col gap-1.5 pt-1">
            <button type="button" class="st-btn st-btn-primary st-btn-block" :disabled="busy[x.id]?.running" :data-export-redownload="x.id" @click="redownload(x)">
              <Download class="w-4 h-4" :stroke-width="2" />
              {{ busy[x.id]?.running ? `받는 중 ${busy[x.id].done}/${busy[x.id].total || x.count}` : '다시 받기' }}
            </button>
            <!-- 준비 중 — 누르면 안내만 (동작은 studioMarketplace.sendToMarketplace 한 곳) -->
            <button type="button" class="st-btn st-btn-block st-soon-btn" aria-disabled="true" :data-export-send="x.id" @click="send(x)">
              <Send class="w-4 h-4" :stroke-width="2" /> 판매처로 보내기 · 준비 중
            </button>
          </div>
          <p v-if="busy[x.id]?.message" class="text-[12px] font-bold break-keep" :class="busy[x.id].error ? 'st-danger-text' : 'st-muted'" :data-export-msg="x.id">{{ busy[x.id].message }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
// 작업 홈 [완성작] — 내보내기로 받은 이미지를 보관한 목록 (studio_exports, api/studio-upload.js exports_list).
// [다시 받기] = 보관된 파일을 그대로 받는다(편집기를 열지 않는다). [판매처로 보내기] = 준비 중(sendToMarketplace 한 곳).
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Download, Send } from 'lucide-vue-next'
import { listArchives, downloadArchive } from '@/lib/studioExportArchive'
import { sendToMarketplace } from '@/lib/studioMarketplace'

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
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('[StudioExportList] 완성작 목록 조회 실패:', e.code, e)
    errorMsg.value = `완성작을 불러오지 못했어요: ${e.message}`
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
  const r = await sendToMarketplace(x.id)
  busy[x.id] = { ...(busy[x.id] || { running: false, done: 0, total: 0 }), message: r.message, error: false }
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 완성작·서명 주소를 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    items.value = []
    errorMsg.value = ''
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
.st-soon-btn { opacity: 0.55; cursor: not-allowed; }
.st-ai-text-soft { color: var(--st-ai); }
</style>
