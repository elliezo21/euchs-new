<template>
  <div class="max-w-3xl mx-auto space-y-4">
    <router-link to="/studio" class="text-sm font-bold text-slate-500 hover:text-slate-800">← 프로젝트 목록</router-link>

    <p v-if="loading" class="text-sm text-slate-400">불러오는 중…</p>
    <p v-else-if="errorMsg" class="text-sm font-bold text-rose-600">{{ errorMsg }}</p>
    <div v-else-if="!project" class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
      프로젝트를 찾을 수 없어요. 삭제됐거나 다른 계정의 프로젝트일 수 있어요.
    </div>

    <template v-else>
      <div class="bg-white rounded-2xl border border-slate-200 p-4">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-md text-[11px] font-black"
            :class="project.source_type === 'upload' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'">
            {{ project.source_type === 'upload' ? '내 사진' : '1688' }}
          </span>
          <span class="text-xs text-slate-500">완료 {{ doneCount }} / 전체 {{ images.length }}</span>
          <span class="ml-auto text-xs font-bold text-slate-500">{{ expiryLabel(project.expires_at) }}</span>
        </div>
        <h2 class="mt-2 text-lg font-black text-slate-900">{{ projectDisplayTitle(project) }}</h2>
        <p class="mt-1 text-xs text-amber-600 font-bold">편집 기능은 준비 중이에요 (다음 단계). 지금은 사진 목록과 사진 추가만 할 수 있어요.</p>
        <div class="mt-3">
          <button type="button" class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold" @click="addOpen = !addOpen">
            {{ addOpen ? '사진 추가 닫기' : '+ 사진 추가' }}
          </button>
        </div>
      </div>

      <div v-if="addOpen">
        <StudioUploadPanel :project-id="project.id" :used-count="usedCount" @finished="onAddFinished" />
      </div>

      <!-- 이미지 세로 목록 (임시 — 1-6b에서 Fabric 편집기로 교체) -->
      <ol class="space-y-3">
        <li
          v-for="(img, idx) in images" :key="img.id"
          class="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          :class="img.ingest_status === 'done' ? '' : 'opacity-50'"
        >
          <div class="flex items-center gap-2 px-3 py-2 text-xs">
            <span class="font-black text-slate-400">{{ idx + 1 }}</span>
            <span class="font-bold text-slate-700 truncate">{{ img.kind === 'upload' ? (img.upload_name || '내 사진') : KIND_LABEL[img.kind] }}</span>
            <span v-if="img.width" class="text-slate-400">{{ img.width }}×{{ img.height }}</span>
            <span class="ml-auto font-bold" :class="STATUS_CLASS[img.ingest_status]">{{ statusText(img) }}</span>
          </div>
          <img v-if="viewUrls.get(img.original_path)" :src="viewUrls.get(img.original_path)" alt="" class="w-full block bg-slate-100" loading="lazy" />
        </li>
      </ol>
      <p v-if="images.length === 0" class="text-sm text-slate-400">아직 사진이 없어요. "사진 추가"로 올려보세요.</p>
    </template>
  </div>
</template>

<script setup>
// 편집기 자리 (임시, Phase 1-6a) — 1-6b에서 Fabric 편집기로 교체된다.
// 지금은 done 이미지 세로 목록(대표 사진 → 상세 → 내 사진) + "사진 추가"만.
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import StudioUploadPanel from '@/components/studio/StudioUploadPanel.vue'
import {
  loadMyProject, listImagesOf, signViewUrls, sortStudioImages,
  projectDisplayTitle, expiryLabel, KIND_LABEL,
} from '@/lib/studioProjects'
import { studioErrorMessage } from '@/lib/studioApi'

const route = useRoute()
const project = ref(null)
const images = ref([])
const viewUrls = ref(new Map())
const loading = ref(false)
const errorMsg = ref('')
const addOpen = ref(false)
let loadSeq = 0

const STATUS_CLASS = { done: 'text-emerald-600', pending: 'text-slate-500', failed: 'text-rose-600' }
const doneCount = computed(() => images.value.filter(i => i.ingest_status === 'done').length)
// 장수 한도에 드는 수 — 서버 prepare와 같은 방식: done + 직접 올린 pending (1688의 가져오지 않은 pending은 세지 않음)
const usedCount = computed(() => images.value.filter(i =>
  i.ingest_status === 'done' || (i.kind === 'upload' && i.ingest_status === 'pending')).length)

function statusText(img) {
  if (img.ingest_status === 'done') return '완료'
  if (img.ingest_status === 'pending') return img.kind === 'upload' ? '올리는 중이거나 멈춤' : '가져오지 않음'
  const code = String(img.ingest_error || '')
  return img.kind === 'upload' ? `실패 · ${studioErrorMessage('upload', code)}` : `실패 · ${code || '원인 미기록'}`
}

async function load() {
  const seq = ++loadSeq
  const projectId = String(route.params.projectId || '')
  loading.value = true
  errorMsg.value = ''
  try {
    const p = await loadMyProject(projectId)
    const imgs = p ? sortStudioImages(await listImagesOf([p.id])) : []
    // 보기용 서명 URL(10분)은 열 때마다 한 번에 새로 발급
    const urls = await signViewUrls(imgs.filter(i => i.ingest_status === 'done' && i.original_path).map(i => i.original_path))
    if (seq !== loadSeq) return
    project.value = p
    images.value = imgs
    viewUrls.value = urls
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('[StudioEditor] 불러오기 실패:', e)
    errorMsg.value = e.message || String(e)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function onAddFinished() {
  load()
}

watch(() => route.params.projectId, () => { if (route.params.projectId) load() })

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 프로젝트·사진·서명 URL을 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    project.value = null
    images.value = []
    viewUrls.value = new Map()
    addOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  load()
})

onUnmounted(() => {
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
})
</script>
