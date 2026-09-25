<template>
  <div class="min-h-screen flex flex-col">
    <!-- 상단 바 -->
    <header class="sticky top-0 z-20 st-surface st-border-b">
      <div class="min-h-[64px] px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-3">
        <router-link :to="{ name: 'studio-projects' }" class="st-icon-btn" title="내 작업으로">
          <ArrowLeft class="w-5 h-5" :stroke-width="2" />
        </router-link>
        <div class="min-w-0 flex-1">
          <h1 class="text-[17px] font-extrabold st-ink truncate">{{ TAB_TITLE[tab] }}</h1>
          <p class="text-[12px] st-muted truncate">{{ tab === 'upload' ? '올린 사진으로 새 작업을 만들어요' : '고른 상품의 대표 사진과 상세 이미지를 한 번에 가져와요' }}</p>
        </div>
        <div class="st-seg order-last w-full sm:order-none sm:w-auto overflow-x-auto">
          <button type="button" class="st-seg-item" :class="{ 'is-active': tab === 'saved' }" @click="setTab('saved')">찜한 상품 {{ savedItems.length }}</button>
          <button type="button" class="st-seg-item" :class="{ 'is-active': tab === 'ordered' }" @click="setTab('ordered')">주문한 상품 {{ orderedBlocked ? 0 : orderedItems.length }}</button>
          <button type="button" class="st-seg-item" :class="{ 'is-active': tab === 'upload' }" @click="setTab('upload')">내 사진</button>
        </div>
      </div>
    </header>

    <main class="flex-1 px-4 sm:px-6 py-6" :class="tab !== 'upload' ? 'pb-32' : ''">
      <!-- 찜·주문 공통 도구줄: 검색 + 카테고리 + 1688 주소 -->
      <div v-if="tab !== 'upload'" class="flex flex-wrap items-center gap-3 mb-5">
        <div class="relative w-full sm:max-w-[420px]">
          <Search class="w-4 h-4 st-muted absolute left-3 top-1/2 -translate-y-1/2" :stroke-width="2" />
          <input v-model="query" type="search" class="st-input" style="padding-left: 36px" :placeholder="tab === 'saved' ? '찜한 상품 검색' : '주문한 상품 검색'" />
        </div>
        <div v-if="tab === 'saved' && categoryChips.length" class="flex flex-wrap gap-1.5">
          <button type="button" class="st-chip" :class="{ 'is-active': !categoryId }" @click="categoryId = null">전체</button>
          <button v-for="c in categoryChips" :key="c.id" type="button" class="st-chip" :class="{ 'is-active': categoryId === c.id }" @click="categoryId = c.id">{{ c.name_ko }}</button>
        </div>
        <div class="flex items-center gap-2 w-full lg:w-auto lg:ml-auto">
          <div class="flex-1 lg:flex-none lg:w-[300px]">
            <input v-model="urlInput" type="text" class="st-input" placeholder="1688 주소로 가져오기" @keydown.enter="submitUrl" />
          </div>
          <button type="button" class="st-btn shrink-0" :disabled="!urlInput.trim() || importFlow?.importing" @click="submitUrl">가져오기</button>
        </div>
        <p v-if="urlEmpty" class="w-full text-[12px] font-bold st-danger-text">주소나 상품번호를 입력해 주세요.</p>
      </div>

      <!-- 찜한 상품 -->
      <template v-if="tab === 'saved'">
        <p v-if="savedLoading" class="st-desc">불러오는 중…</p>
        <p v-else-if="savedError" class="text-[14px] font-bold st-danger-text">{{ savedError }}</p>
        <div v-else-if="savedItems.length === 0" class="st-card py-16 text-center">
          <p class="st-h-card">아직 찜한 상품이 없어요</p>
          <router-link to="/mall" class="mt-3 inline-block st-link text-[14px]">이유씨몰에서 상품 찜하기 →</router-link>
        </div>
        <p v-else-if="savedCards.length === 0" class="st-desc">검색 결과가 없어요.</p>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[18px]">
          <PickCard v-for="c in savedCards" :key="c.key" :card="c" :selected="selected?.itemId === c.itemId" @select="select(c)" />
        </div>
      </template>

      <!-- 주문한 상품 -->
      <template v-if="tab === 'ordered'">
        <p v-if="orderedLoading" class="st-desc">불러오는 중…</p>
        <p v-else-if="orderedError" class="text-[14px] font-bold st-danger-text">{{ orderedError }}</p>
        <p v-else-if="orderedBlocked" class="st-desc">{{ ORDERED_ADMIN_MESSAGE }}</p>
        <div v-else-if="orderedItems.length === 0" class="st-card py-16 text-center st-h-card">아직 주문한 상품이 없어요</div>
        <p v-else-if="orderedCards.length === 0" class="st-desc">검색 결과가 없어요.</p>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[18px]">
          <PickCard v-for="c in orderedCards" :key="c.key" :card="c" :selected="selected?.itemId === c.itemId" @select="select(c)" />
        </div>
      </template>

      <!-- 내 사진 -->
      <section v-if="tab === 'upload'" class="max-w-3xl space-y-3">
        <StudioUploadPanel @finished="onUploadFinished" />
        <div v-if="uploadedProjectId && !autoNavigated" class="flex justify-end">
          <button type="button" class="st-btn st-btn-primary" @click="openEditor(uploadedProjectId)">편집기로 가기</button>
        </div>
      </section>
    </main>

    <!-- 하단 고정 바 -->
    <footer v-if="tab !== 'upload'" class="fixed bottom-0 inset-x-0 z-20 st-surface st-border-t">
      <div class="h-[84px] px-4 sm:px-6 flex items-center gap-3">
        <template v-if="selected">
          <img :src="selected.image" alt="" referrerpolicy="no-referrer" class="w-12 h-12 rounded-[10px] object-cover st-soft-bg shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="text-[14px] font-bold st-ink truncate">{{ selected.name }}</div>
            <div class="text-[12px] st-muted truncate">대표 사진과 상세 이미지를 최대 {{ STUDIO_MAX_IMAGES }}장까지 가져와요</div>
          </div>
        </template>
        <div v-else class="flex-1 text-[14px] font-semibold st-muted">상품을 하나 골라주세요</div>
        <button type="button" class="st-btn st-btn-primary st-btn-xl shrink-0" :disabled="!selected || importFlow?.importing" @click="start">
          이 상품으로 시작
        </button>
      </div>
    </footer>

    <StudioImportFlow ref="importFlow" />
  </div>
</template>

<script setup>
// 스튜디오 고르기 — 찜한 상품 / 주문한 상품 / 내 사진 (+ 1688 주소). 카드 클릭 = 선택, [이 상품으로 시작]을 눌러야 가져온다.
import { ref, computed, h, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Search, Check } from 'lucide-vue-next'
import { listSavedProducts, fetchMajorCategories } from '@/lib/savedProducts'
import { fetchOrderedProducts, ADMIN_SESSION_MESSAGE as ORDERED_ADMIN_MESSAGE } from '@/lib/orderedProducts'
import { listMyProjects } from '@/lib/studioProjects'
import { STUDIO_MAX_IMAGES } from '@/lib/studioApi'
import StudioUploadPanel from '@/components/studio/StudioUploadPanel.vue'
import StudioImportFlow from '@/components/studio/StudioImportFlow.vue'

const TABS = ['saved', 'ordered', 'upload']
const TAB_TITLE = { saved: '찜한 상품에서 고르기', ordered: '주문한 상품에서 고르기', upload: '내 사진으로 시작' }

const route = useRoute()
const router = useRouter()
const importFlow = ref(null)
const tab = ref(TABS.includes(route.query.tab) ? route.query.tab : 'saved')
const query = ref('')
const categoryId = ref(null)
const selected = ref(null)

function setTab(t) {
  tab.value = t
  selected.value = null
  query.value = ''
  categoryId.value = null
  router.replace({ query: { ...route.query, tab: t } })
}

// ── 카드 (사진·이름·가격·날짜·작업 수·판매 중지·선택) ──
const PickCard = (props, { emit }) => {
  const c = props.card
  return h('button', {
    type: 'button',
    class: ['st-card overflow-hidden text-left relative', props.selected ? 'is-selected' : 'st-card-hover', c.unavailable ? 'opacity-40 cursor-not-allowed' : ''],
    disabled: c.unavailable,
    title: c.unavailable ? '판매 중지된 상품이라 고를 수 없어요' : '',
    onClick: () => emit('select'),
  }, [
    h('div', { class: 'relative h-[218px] st-soft-bg' }, [
      c.image ? h('img', { src: c.image, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy', class: 'w-full h-full object-cover' }) : null,
      c.projectCount ? h('span', { class: 'st-badge st-badge-scrim absolute left-2.5 bottom-2.5' }, `작업 ${c.projectCount}개 있음`) : null,
      c.unavailable ? h('span', { class: 'st-badge st-badge-danger absolute left-2.5 top-2.5' }, '판매 중지') : null,
      props.selected ? h('span', { class: 'absolute right-2.5 top-2.5 w-6 h-6 rounded-full flex items-center justify-center st-logo-mark' },
        [h(Check, { class: 'w-4 h-4', 'stroke-width': 3 })]) : null,
    ]),
    h('div', { class: 'p-3' }, [
      h('div', { class: 'text-[14px] font-bold st-ink line-clamp-2' }, c.name),
      h('div', { class: 'mt-1 text-[12px] st-muted' }, c.meta),
    ]),
  ])
}
PickCard.props = ['card', 'selected']
PickCard.emits = ['select']

function select(c) {
  if (c.unavailable) return
  selected.value = selected.value?.itemId === c.itemId ? null : c
}

function shortDate(s) {
  if (!s) return ''
  const d = new Date(s)
  return `${d.getMonth() + 1}.${d.getDate()}`
}
// 가격이 없으면 가격 칸을 비운다 (임의 숫자 금지)
function metaLine(price, date, verb) {
  const parts = []
  if (Number.isFinite(Number(price)) && Number(price) > 0) parts.push(`¥${Number(price).toFixed(2).replace(/\.00$/, '')}`)
  if (date) parts.push(`${shortDate(date)} ${verb}`)
  return parts.join(' · ')
}
function matches(texts) {
  const q = query.value.trim().toLowerCase()
  return !q || texts.filter(Boolean).some(v => String(v).toLowerCase().includes(q))
}

// ── 이미 작업이 있는 상품 (내 프로젝트의 offer_id 수) ──
const projectCountByOffer = ref(new Map())
async function loadProjectCounts() {
  try {
    const list = await listMyProjects()
    const m = new Map()
    for (const p of list) if (p.offer_id) m.set(String(p.offer_id), (m.get(String(p.offer_id)) || 0) + 1)
    projectCountByOffer.value = m
  } catch (e) {
    // 배지만 못 그릴 뿐 고르기는 된다 — 원인은 남긴다
    console.error('[StudioNew] 작업 수 조회 실패 (배지 생략):', e)
  }
}

// ── 찜 (기존 내상품리스트와 같은 함수) ──
const savedItems = ref([])
const savedLoading = ref(false)
const savedError = ref('')
const categories = ref([])
const HANGUL_RE = /[가-힣]/
const CJK_RE = /[一-鿿]/
// 표시 순서: display_name → item_data.titleKo(한글) → title_zh — SourcingProductsView의 displayTitle과 같은 규칙
function savedTitle(item) {
  const ko = String(item.item_data?.titleKo || '').trim()
  const koOk = ko && !(!HANGUL_RE.test(ko) && CJK_RE.test(ko)) ? ko : ''
  return item.display_name || koOk || item.title_zh || ko || '이름 없는 상품'
}
const categoryChips = computed(() => {
  const used = new Set(savedItems.value.map(i => i.category_id).filter(Boolean))
  return categories.value.filter(c => used.has(c.id))
})
const savedCards = computed(() => savedItems.value
  .filter(it => !categoryId.value || it.category_id === categoryId.value)
  .filter(it => matches([it.display_name, it.item_data?.titleKo, it.title_zh, it.item_id]))
  .map(it => ({
    key: it.id,
    itemId: String(it.item_id),
    name: savedTitle(it),
    image: it.image_url || it.item_data?.imageUrl || '',
    meta: metaLine(it.snapshot_price, it.created_at, '찜'),
    unavailable: !!it.is_unavailable,
    projectCount: projectCountByOffer.value.get(String(it.item_id)) || 0,
  })))
async function loadSaved() {
  savedLoading.value = true
  savedError.value = ''
  try {
    const [items, cats] = await Promise.all([listSavedProducts(), fetchMajorCategories().catch(e => {
      console.error('[StudioNew] 카테고리 조회 실패 (칩 생략):', e)
      return []
    })])
    savedItems.value = items
    categories.value = cats
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
const orderedCards = computed(() => orderedItems.value
  .filter(it => matches([it.title, it.itemId]))
  .map(it => ({
    key: it.itemId,
    itemId: String(it.itemId),
    name: it.title || '이름 없는 상품',
    image: it.imageUrl || '',
    meta: metaLine(it.lastUnitPrice, it.lastOrderedAt, '주문'),
    unavailable: false,
    projectCount: projectCountByOffer.value.get(String(it.itemId)) || 0,
  })))
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

// ── 시작 (가져오기 로직은 StudioImportFlow) ──
function start() {
  if (!selected.value) return
  importFlow.value?.pick(selected.value.itemId)
}

const urlInput = ref('')
const urlEmpty = ref(false)
function submitUrl() {
  const v = urlInput.value.trim()
  urlEmpty.value = !v
  if (!v) return
  importFlow.value?.importUrl(v)
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
function openEditor(projectId) {
  router.push({ name: 'studio-editor', params: { projectId } })
}

watch(() => route.query.tab, t => { if (TABS.includes(t) && t !== tab.value) tab.value = t })

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 찜·주문 목록을 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    savedItems.value = []
    orderedItems.value = []
    orderedBlocked.value = false
    selected.value = null
    projectCountByOffer.value = new Map()
    importFlow.value?.reset()
  }
}

onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  // 탭 숫자를 보여야 하므로 두 목록을 함께 읽는다
  loadSaved()
  loadOrdered()
  loadProjectCounts()
})
onUnmounted(() => window.removeEventListener('euchs-auth-changed', onStudioAuthChanged))
</script>
