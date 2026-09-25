<template>
  <div class="px-4 sm:px-12 py-9 max-w-[1320px] space-y-10">
    <!-- 6-1. 시작하기 -->
    <section id="start" class="scroll-mt-6">
      <h1 class="st-h-page">무엇으로 시작할까요?</h1>
      <p class="mt-2 text-[15px] st-ink-2">상품 사진을 불러오면 중국어를 지우고, 한글을 올리고, 상세페이지로 내보낼 수 있어요.</p>

      <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- 찜한 상품 -->
        <button type="button" class="st-card st-card-hover overflow-hidden text-left" @click="goPick('saved')">
          <div class="h-[150px] overflow-hidden">
            <div v-if="savedThumbs.length" class="grid gap-[3px] h-full" :style="{ gridTemplateColumns: `repeat(${savedThumbs.length}, 1fr)` }">
              <img v-for="(src, i) in savedThumbs" :key="i" :src="src" alt="" referrerpolicy="no-referrer" class="w-full h-[150px] object-cover" />
            </div>
            <div v-else class="h-full st-placeholder"><Heart class="w-7 h-7" :stroke-width="1.5" /></div>
          </div>
          <CardFoot :icon="Heart" title="찜한 상품에서" desc="내상품리스트에 담아둔 1688 상품" :error="savedError" />
        </button>

        <!-- 주문한 상품 -->
        <button type="button" class="st-card st-card-hover overflow-hidden text-left" @click="goPick('ordered')">
          <div class="h-[150px] overflow-hidden">
            <div v-if="orderedThumbs.length" class="grid gap-[3px] h-full" :style="{ gridTemplateColumns: `repeat(${orderedThumbs.length}, 1fr)` }">
              <img v-for="(src, i) in orderedThumbs" :key="i" :src="src" alt="" referrerpolicy="no-referrer" class="w-full h-[150px] object-cover" />
            </div>
            <div v-else class="h-full st-placeholder"><Package class="w-7 h-7" :stroke-width="1.5" /></div>
          </div>
          <CardFoot :icon="Package" title="주문한 상품에서" desc="이유씨로 사입했던 상품" :error="orderedError" />
        </button>

        <!-- 내 사진 — 카드 자체가 드롭 영역 -->
        <div
          role="button" tabindex="0"
          class="st-card st-card-hover overflow-hidden text-left cursor-pointer"
          @click="openUpload"
          @keydown.enter="openUpload"
          @dragover.prevent="cardDrag = true"
          @dragleave.prevent="cardDrag = false"
          @drop.prevent="onCardDrop"
        >
          <div class="h-[150px] p-3">
            <div class="st-dropzone h-full flex flex-col items-center justify-center gap-1.5" :class="{ 'is-drag': cardDrag }">
              <FolderUp class="w-6 h-6 st-muted" :stroke-width="2" />
              <span class="text-[13px] font-bold st-ink-2">사진이나 폴더를 끌어다 놓기</span>
            </div>
          </div>
          <CardFoot :icon="Camera" title="내 사진으로" desc="폰·카메라로 직접 찍은 사진" />
        </div>
      </div>

      <!-- 1688 주소 한 줄 -->
      <div class="mt-4 st-surface st-border rounded-[12px] h-14 px-4 flex items-center gap-3">
        <Link2 class="w-[18px] h-[18px] st-muted shrink-0" :stroke-width="2" />
        <span class="text-[13px] font-bold st-ink-2 shrink-0 hidden sm:inline">1688 주소</span>
        <input
          v-model="urlInput" type="text" class="st-input-bare flex-1"
          placeholder="detail.1688.com/offer/… 주소를 붙여넣으세요"
          @keydown.enter="submitUrl"
        />
        <button type="button" class="st-btn shrink-0" :disabled="!urlInput.trim() || importFlow?.importing" @click="submitUrl">가져오기</button>
      </div>
      <p v-if="urlEmpty" class="mt-1.5 text-[12px] font-bold st-danger-text">주소나 상품번호를 입력해 주세요.</p>

      <!-- 내 사진 올리기 (카드 드롭을 곧바로 받을 수 있게 항상 붙여 두고, 열 때만 보인다) -->
      <div v-show="uploadOpen" class="mt-4 st-card p-5">
        <div class="flex items-center mb-3">
          <h2 class="st-h-card">내 사진 올리기</h2>
          <button type="button" class="st-icon-btn ml-auto" title="닫기" @click="uploadOpen = false"><X class="w-4 h-4" :stroke-width="2" /></button>
        </div>
        <StudioUploadPanel ref="uploadPanel" @finished="onUploadFinished" />
        <div v-if="uploadedProjectId && !autoNavigated" class="mt-3 flex justify-end">
          <button type="button" class="st-btn st-btn-primary" @click="openEditor(uploadedProjectId)">편집기로 가기</button>
        </div>
      </div>
    </section>

    <!-- 6-2. 최근 작업 (0개면 숨김) -->
    <StudioRecentProjects title="최근 작업" :limit="8" show-filters />

    <StudioImportFlow ref="importFlow" />
  </div>
</template>

<script setup>
// 스튜디오 내 작업 — 시작하기(찜·주문·내 사진·1688 주소) + 최근 작업
import { ref, h, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Heart, Package, Camera, FolderUp, Link2, X, ArrowRight } from 'lucide-vue-next'
import { listSavedProducts } from '@/lib/savedProducts'
import { fetchOrderedProducts } from '@/lib/orderedProducts'
import StudioUploadPanel from '@/components/studio/StudioUploadPanel.vue'
import StudioRecentProjects from '@/components/studio/StudioRecentProjects.vue'
import StudioImportFlow from '@/components/studio/StudioImportFlow.vue'

// 카드 아래쪽 (아이콘 상자 + 제목 + 설명 + 화살표)
const CardFoot = (props) => h('div', { class: 'flex items-center gap-3 px-[18px] py-4' }, [
  h('span', { class: 'st-icon-box' }, [h(props.icon, { class: 'w-[18px] h-[18px]', 'stroke-width': 2 })]),
  h('span', { class: 'min-w-0 flex-1' }, [
    h('span', { class: 'block st-h-card' }, props.title),
    h('span', { class: 'block st-desc' }, props.desc),
    props.error ? h('span', { class: 'block text-[12px] font-bold st-danger-text' }, props.error) : null,
  ]),
  h(ArrowRight, { class: 'w-4 h-4 st-muted shrink-0', 'stroke-width': 2 }),
])
CardFoot.props = ['icon', 'title', 'desc', 'error']

const router = useRouter()
const importFlow = ref(null)
const uploadPanel = ref(null)

// ── 콜라주 (기존 내상품리스트·재주문과 같은 함수) ──
const savedThumbs = ref([])
const orderedThumbs = ref([])
const savedError = ref('')
const orderedError = ref('')
async function loadCollages() {
  savedError.value = ''
  orderedError.value = ''
  const [s, o] = await Promise.allSettled([listSavedProducts(), fetchOrderedProducts()])
  if (s.status === 'fulfilled') {
    savedThumbs.value = s.value.map(it => it.image_url || it.item_data?.imageUrl || '').filter(Boolean).slice(0, 3)
  } else {
    console.error('[StudioHome] 찜 목록 조회 실패:', s.reason)
    savedError.value = '찜 목록을 불러오지 못했어요'
  }
  if (o.status === 'fulfilled') {
    orderedThumbs.value = (o.value.items || []).map(it => it.imageUrl).filter(Boolean).slice(0, 2)
  } else {
    console.error('[StudioHome] 주문한 상품 조회 실패:', o.reason)
    orderedError.value = '주문한 상품을 불러오지 못했어요'
  }
}

function goPick(tab) {
  router.push({ name: 'studio-new', query: { tab } })
}

// ── 1688 주소 (가져오기 로직은 StudioImportFlow) ──
const urlInput = ref('')
const urlEmpty = ref(false)
function submitUrl() {
  const v = urlInput.value.trim()
  urlEmpty.value = !v
  if (!v) return
  importFlow.value?.importUrl(v)
}

// ── 내 사진 ──
const uploadOpen = ref(false)
const cardDrag = ref(false)
const uploadedProjectId = ref(null)
const autoNavigated = ref(false)
function openUpload() {
  uploadOpen.value = true
  uploadPanel.value?.openPicker()
}
function onCardDrop(e) {
  cardDrag.value = false
  // dataTransfer는 이 이벤트 안에서만 읽힌다 — 패널이 이미 붙어 있으므로 곧바로 넘긴다
  uploadPanel.value?.addDrop(e.dataTransfer)
  uploadOpen.value = true
}
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

// 사이드바 [+ 새로 만들기] → #start 스크롤은 라우터 scrollBehavior(hash)가 한다

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 찜·주문 사진을 비운다 (최근 작업은 StudioRecentProjects가 비운다)
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    savedThumbs.value = []
    orderedThumbs.value = []
    uploadOpen.value = false
    importFlow.value?.reset()
  } else {
    loadCollages()
  }
}

onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  loadCollages()
})
onUnmounted(() => window.removeEventListener('euchs-auth-changed', onStudioAuthChanged))
</script>
