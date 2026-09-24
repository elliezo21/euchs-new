<template>
  <div class="max-w-5xl mx-auto space-y-4">
    <div class="flex items-center gap-3">
      <router-link to="/studio" class="text-sm font-bold text-slate-500 hover:text-slate-800">← 프로젝트 목록</router-link>
    </div>
    <h2 class="text-xl font-black text-slate-900">새로 만들기</h2>

    <!-- 세 입구 (크게) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <button
        v-for="s in SOURCES" :key="s.key" type="button"
        class="rounded-2xl border-2 p-5 text-left transition"
        :class="source === s.key ? 'border-brand-blue bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'"
        @click="selectSource(s.key)"
      >
        <div class="text-2xl">{{ s.icon }}</div>
        <div class="mt-2 text-base font-black text-slate-900">{{ s.label }}</div>
        <div class="mt-1 text-xs text-slate-500">{{ s.desc }}</div>
      </button>
    </div>

    <!-- 주소로 직접 추가 (작게, 접힘) -->
    <div class="bg-white rounded-2xl border border-slate-200">
      <button type="button" class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-600" @click="urlOpen = !urlOpen">
        <span>1688 주소로 직접 추가</span>
        <span class="transition-transform" :class="urlOpen ? 'rotate-180' : ''">▾</span>
      </button>
      <div v-if="urlOpen" class="px-4 pb-4 flex flex-col sm:flex-row gap-2">
        <input
          v-model="urlInput" type="text" placeholder="https://detail.1688.com/offer/…html 또는 상품번호"
          class="flex-1 min-w-0 border border-slate-300 rounded-xl px-3 py-2 text-sm"
          @keydown.enter="submitUrl"
        />
        <button type="button" class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40"
          :disabled="!urlInput.trim() || importing" @click="submitUrl">가져오기</button>
      </div>
      <p v-if="urlOpen && urlEmpty" class="px-4 pb-3 -mt-2 text-xs font-bold text-rose-600">주소나 상품번호를 입력해 주세요.</p>
    </div>

    <!-- 찜 -->
    <section v-if="source === 'saved'" class="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <input v-model="savedQuery" type="search" placeholder="찜한 상품 검색" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" />
      <p v-if="savedLoading" class="text-sm text-slate-400">불러오는 중…</p>
      <p v-else-if="savedError" class="text-sm font-bold text-rose-600">{{ savedError }}</p>
      <div v-else-if="savedItems.length === 0" class="py-10 text-center text-sm text-slate-400">
        아직 찜한 상품이 없어요.
        <router-link to="/mall" class="ml-1 font-bold text-brand-blue">1688 소싱몰 가기</router-link>
      </div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <button
          v-for="it in filteredSaved" :key="it.id" type="button"
          class="text-left rounded-xl border border-slate-200 overflow-hidden bg-white transition"
          :class="it.is_unavailable ? 'opacity-40 cursor-not-allowed' : 'hover:border-brand-blue'"
          :disabled="it.is_unavailable || importing"
          :title="it.is_unavailable ? '판매중단 상품이라 고를 수 없어요' : ''"
          @click="pick1688(it.item_id)"
        >
          <img :src="it.image_url || it.item_data?.imageUrl || ''" alt="" class="w-full aspect-square object-cover bg-slate-100" loading="lazy" />
          <div class="p-2">
            <div class="text-xs font-bold text-slate-800 line-clamp-2">{{ savedTitle(it) }}</div>
            <div v-if="it.is_unavailable" class="mt-1 text-[11px] font-bold text-rose-600">판매중단</div>
          </div>
        </button>
      </div>
      <p v-if="savedItems.length && filteredSaved.length === 0" class="text-sm text-slate-400">검색 결과가 없어요.</p>
    </section>

    <!-- 주문한 상품 -->
    <section v-if="source === 'ordered'" class="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <p v-if="orderedLoading" class="text-sm text-slate-400">불러오는 중…</p>
      <p v-else-if="orderedError" class="text-sm font-bold text-rose-600">{{ orderedError }}</p>
      <p v-else-if="orderedBlocked" class="text-sm text-slate-500">{{ ORDERED_ADMIN_MESSAGE }}</p>
      <div v-else-if="orderedItems.length === 0" class="py-10 text-center text-sm text-slate-400">아직 주문한 상품이 없어요.</div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <button
          v-for="it in orderedItems" :key="it.itemId" type="button"
          class="text-left rounded-xl border border-slate-200 overflow-hidden bg-white hover:border-brand-blue transition"
          :disabled="importing"
          @click="pick1688(it.itemId)"
        >
          <img :src="it.imageUrl || ''" alt="" class="w-full aspect-square object-cover bg-slate-100" loading="lazy" />
          <div class="p-2">
            <div class="text-xs font-bold text-slate-800 line-clamp-2">{{ it.title || '이름 없는 상품' }}</div>
            <div class="mt-1 text-[11px] text-slate-400">{{ it.orderCount }}번 주문</div>
          </div>
        </button>
      </div>
    </section>

    <!-- 내 사진 -->
    <section v-if="source === 'upload'" class="space-y-2">
      <StudioUploadPanel @finished="onUploadFinished" />
      <div v-if="uploadedProjectId && !autoNavigated" class="flex justify-end">
        <button type="button" class="px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-black" @click="openEditor(uploadedProjectId)">
          편집기로 가기
        </button>
      </div>
    </section>

    <!-- 같은 상품의 기존 작업 -->
    <StudioModal :open="existingModal.open" title="이 상품으로 만든 작업이 있어요" @close="existingModal.open = false">
      <p>
        {{ existingModal.list.length }}개가 있어요. 가장 최근:
        <b>{{ existingModal.list[0] ? projectDisplayTitle(existingModal.list[0]) : '' }}</b>
        <span class="text-slate-400">({{ existingModal.list[0] ? formatDate(existingModal.list[0].created_at) : '' }})</span>
      </p>
      <template #actions>
        <button type="button" class="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold" @click="existingModal.open = false">취소</button>
        <button type="button" class="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold" @click="openEditor(existingModal.list[0].id)">기존 작업 열기</button>
        <button type="button" class="px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-bold" @click="createFromExisting">새로 만들기</button>
      </template>
    </StudioModal>

    <!-- 1688 가져오기 진행 -->
    <StudioModal :open="imp.open" :title="imp.title" @close="closeImport">
      <template v-if="imp.phase === 'product'">
        <p>1688에서 상품 정보를 불러오는 중이에요…</p>
      </template>
      <template v-else-if="imp.phase === 'ingest' || imp.phase === 'done'">
        <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full bg-brand-blue transition-all" :style="{ width: progressPct + '%' }" />
        </div>
        <p class="mt-2">
          {{ imp.done + imp.failed }} / {{ imp.total }}장
          <span v-if="imp.failed" class="text-rose-600 font-bold"> · 실패 {{ imp.failed }}장</span>
        </p>
        <p v-if="imp.capped" class="mt-1 text-xs font-bold text-amber-600">사진이 {{ imp.available }}장이라 {{ MAX_IMPORT }}장까지만 가져왔어요.</p>
        <p v-if="imp.ingestError" class="mt-1 text-xs font-bold text-rose-600">{{ imp.ingestError }}</p>
      </template>
      <template v-else-if="imp.phase === 'error'">
        <p class="font-bold text-rose-600">{{ imp.error }}</p>
      </template>
      <template #actions>
        <button v-if="imp.phase === 'error'" type="button" class="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold" @click="closeImport">닫기</button>
        <button v-if="imp.phase === 'done'" type="button" class="px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-bold" @click="openEditor(imp.projectId)">편집기 열기</button>
      </template>
    </StudioModal>

    <!-- 가져오는 도중 화면 이동 경고 -->
    <StudioModal :open="leaveModal" title="가져오는 중이에요" @close="leaveModal = false">
      지금 나가면 남은 사진은 가져오지 않아요. 그래도 나갈까요?
      <template #actions>
        <button type="button" class="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold" @click="leaveModal = false">계속하기</button>
        <button type="button" class="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold" @click="confirmLeave">나가기</button>
      </template>
    </StudioModal>
  </div>
</template>

<script setup>
// 스튜디오 새로 만들기 — 찜 / 주문한 상품 / 내 사진 / 1688 주소
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { listSavedProducts } from '@/lib/savedProducts'
import { fetchOrderedProducts, ADMIN_SESSION_MESSAGE as ORDERED_ADMIN_MESSAGE } from '@/lib/orderedProducts'
import { callStudioApi, studioErrorMessage, STUDIO_MAX_IMAGES } from '@/lib/studioApi'
import { findProjectsByOffer, projectDisplayTitle } from '@/lib/studioProjects'
import StudioModal from '@/components/studio/StudioModal.vue'
import StudioUploadPanel from '@/components/studio/StudioUploadPanel.vue'

const MAX_IMPORT = STUDIO_MAX_IMAGES // 1688 가져오기 최대 장수 = 프로젝트 한도
const INGEST_BATCH = 6
const SOURCES = [
  { key: 'saved', icon: '⭐', label: '내 찜 상품에서 고르기', desc: '내상품리스트에 담아둔 1688 상품' },
  { key: 'ordered', icon: '📦', label: '주문한 상품에서 고르기', desc: '이유씨컴퍼니로 주문했던 상품' },
  { key: 'upload', icon: '📷', label: '내 사진으로 시작', desc: '폰·카메라로 찍은 사진' },
]

const router = useRouter()
const source = ref('')
const urlOpen = ref(false)
const urlInput = ref('')
const urlEmpty = ref(false)

// ── 찜 (기존 내상품리스트와 같은 함수) ──
const savedItems = ref([])
const savedLoading = ref(false)
const savedError = ref('')
const savedQuery = ref('')
const HANGUL_RE = /[가-힣]/
const CJK_RE = /[一-鿿]/
// 표시 순서: display_name → item_data.titleKo(한글) → title_zh — SourcingProductsView의 displayTitle과 같은 규칙
function savedTitle(item) {
  const ko = String(item.item_data?.titleKo || '').trim()
  const koOk = ko && !(!HANGUL_RE.test(ko) && CJK_RE.test(ko)) ? ko : ''
  return item.display_name || koOk || item.title_zh || ko || '이름 없는 상품'
}
const filteredSaved = computed(() => {
  const q = savedQuery.value.trim().toLowerCase()
  if (!q) return savedItems.value
  return savedItems.value.filter(it =>
    [it.display_name, it.item_data?.titleKo, it.title_zh, it.item_id].filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q)))
})
async function loadSaved() {
  savedLoading.value = true
  savedError.value = ''
  try {
    savedItems.value = await listSavedProducts()
  } catch (e) {
    console.error('[StudioNew] 찜 목록 조회 실패:', e)
    savedError.value = e.message || String(e)
  } finally {
    savedLoading.value = false
  }
}

// ── 주문한 상품 (기존 재주문 탭과 같은 함수) ──
const orderedItems = ref([])
const orderedLoading = ref(false)
const orderedError = ref('')
const orderedBlocked = ref(false)
async function loadOrdered() {
  orderedLoading.value = true
  orderedError.value = ''
  try {
    const { blocked, items } = await fetchOrderedProducts()
    orderedBlocked.value = blocked
    orderedItems.value = items
  } catch (e) {
    console.error('[StudioNew] 주문한 상품 조회 실패:', e)
    orderedError.value = e.message || String(e)
  } finally {
    orderedLoading.value = false
  }
}

function selectSource(key) {
  source.value = key
  if (key === 'saved' && !savedItems.value.length && !savedLoading.value) loadSaved()
  if (key === 'ordered' && !orderedItems.value.length && !orderedLoading.value) loadOrdered()
}

// ── 1688 가져오기 ──
const existingModal = reactive({ open: false, list: [], offerId: null })
const imp = reactive({
  open: false, phase: 'idle', title: '', total: 0, done: 0, failed: 0, available: 0,
  capped: false, projectId: null, error: '', ingestError: '',
})
const importing = computed(() => imp.phase === 'product' || imp.phase === 'ingest')
const progressPct = computed(() => (imp.total ? Math.round(((imp.done + imp.failed) / imp.total) * 100) : 0))

function formatDate(s) {
  return s ? new Date(s).toLocaleDateString('ko-KR') : ''
}

async function pick1688(offerId) {
  if (importing.value) return
  try {
    const list = await findProjectsByOffer(offerId)
    if (list.length > 0) {
      existingModal.list = list
      existingModal.offerId = offerId
      existingModal.open = true
      return
    }
  } catch (e) {
    console.error('[StudioNew] 기존 작업 확인 실패:', e)
    imp.open = true
    imp.phase = 'error'
    imp.title = '가져오기 실패'
    imp.error = e.message
    return
  }
  runImport({ offerId: String(offerId) })
}

function createFromExisting() {
  existingModal.open = false
  runImport({ offerId: String(existingModal.offerId) })
}

function submitUrl() {
  const v = urlInput.value.trim()
  urlEmpty.value = !v
  if (!v || importing.value) return
  // 주소 파싱은 서버(studio-product)가 한다
  runImport({ url: v })
}

async function runImport(target) {
  Object.assign(imp, {
    open: true, phase: 'product', title: '1688 상품 가져오기', total: 0, done: 0, failed: 0, available: 0,
    capped: false, projectId: null, error: '', ingestError: '',
  })
  const p = await callStudioApi('studio-product', target)
  if (!p.ok) {
    imp.phase = 'error'
    imp.title = '가져오기 실패'
    imp.error = studioErrorMessage('product', p.code)
    return
  }
  imp.projectId = p.data.projectId

  // 가져오는 순서: 대표 사진(gallery) → 상세(desc), 각각 sortOrder 순 (DB sort_order는 바꾸지 않는다)
  const bySort = (a, b) => a.sortOrder - b.sortOrder
  const ordered = [...(p.data.gallery || [])].sort(bySort).concat([...(p.data.images || [])].sort(bySort))
  imp.available = ordered.length
  imp.capped = ordered.length > MAX_IMPORT
  const ids = ordered.slice(0, MAX_IMPORT).map(i => i.id)
  imp.total = ids.length
  imp.phase = 'ingest'

  for (let i = 0; i < ids.length; i += INGEST_BATCH) {
    const chunk = ids.slice(i, i + INGEST_BATCH)
    const r = await callStudioApi('studio-ingest', { projectId: imp.projectId, imageIds: chunk })
    if (!r.ok) {
      imp.failed += chunk.length
      imp.ingestError = studioErrorMessage('ingest', r.code)
      continue
    }
    for (const id of chunk) {
      if (r.data.results?.[id]?.status === 'done') imp.done++
      else imp.failed++
    }
  }
  imp.phase = 'done'
  imp.title = '가져오기 완료'
  // 모두 잘 끝났으면 바로 편집기로, 실패·장수 제한이 있으면 안내를 보여주고 버튼으로 이동
  if (!imp.capped && imp.failed === 0 && ids.length > 0) openEditor(imp.projectId)
}

function closeImport() {
  if (importing.value) return
  imp.open = false
}

function openEditor(projectId) {
  existingModal.open = false
  imp.open = false
  router.push({ name: 'studio-editor', params: { projectId } })
}

// ── 내 사진 ──
const uploadedProjectId = ref(null)
const autoNavigated = ref(false)
function onUploadFinished({ projectId, done, failed }) {
  uploadedProjectId.value = projectId
  // 전부 성공했으면 바로 편집기로. 실패가 있으면 다시 시도할 수 있게 머문다
  if (projectId && done > 0 && failed === 0) {
    autoNavigated.value = true
    openEditor(projectId)
  }
}

// ── 가져오는 도중 이탈 ──
const leaveModal = ref(false)
let pendingLeave = null
let allowLeave = false
onBeforeRouteLeave(to => {
  if (!importing.value || allowLeave) return true
  pendingLeave = to
  leaveModal.value = true
  return false
})
function confirmLeave() {
  leaveModal.value = false
  allowLeave = true
  if (pendingLeave) router.push(pendingLeave)
}
const onBeforeUnload = e => {
  if (!importing.value) return
  e.preventDefault()
  e.returnValue = ''
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 찜·주문 목록을 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    savedItems.value = []
    orderedItems.value = []
    orderedBlocked.value = false
    existingModal.open = false
    source.value = ''
  }
}

onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  window.addEventListener('beforeunload', onBeforeUnload)
})
onUnmounted(() => {
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
  window.removeEventListener('beforeunload', onBeforeUnload)
})
</script>
