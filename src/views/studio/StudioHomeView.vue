<template>
  <div class="max-w-6xl mx-auto space-y-4">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-black text-slate-900">프로젝트</h2>
      <router-link
        :to="{ name: 'studio-new' }"
        class="ml-auto px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-black shadow-sm"
      >+ 새로 만들기</router-link>
    </div>

    <p v-if="loading" class="text-sm text-slate-400">불러오는 중…</p>
    <p v-else-if="errorMsg" class="text-sm font-bold text-rose-600">{{ errorMsg }}</p>

    <!-- 빈 상태 (내상품리스트 빈 상태와 같은 모양) -->
    <div v-else-if="projects.length === 0" class="bg-white border border-gray-200 rounded-2xl shadow-xs py-20 text-center">
      <div class="text-5xl mb-4">🖼️</div>
      <p class="text-sm font-bold text-gray-400 mb-2">아직 만든 상세페이지가 없어요</p>
      <p class="text-xs text-gray-400">찜한 1688 상품이나 내 사진으로 시작해 보세요</p>
      <router-link
        :to="{ name: 'studio-new' }"
        class="inline-block mt-5 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition cursor-pointer shadow-sm"
      >새로 만들기</router-link>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <article v-for="p in projects" :key="p.id" class="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
        <router-link :to="{ name: 'studio-editor', params: { projectId: p.id } }" class="block aspect-[4/3] overflow-hidden bg-slate-100">
          <img v-if="p.thumbUrl" :src="p.thumbUrl" alt="" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-xs text-slate-400">사진 준비 중</div>
        </router-link>
        <div class="p-3 flex-1 flex flex-col gap-1.5">
          <div class="flex items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-md text-[11px] font-black"
              :class="p.source_type === 'upload' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'">
              {{ p.source_type === 'upload' ? '내 사진' : '1688' }}
            </span>
            <span class="text-[11px] font-bold" :class="expiryClass(p.expires_at)">{{ expiryLabel(p.expires_at) }}</span>
            <span class="ml-auto text-[11px] text-slate-400">{{ formatDate(p.created_at) }}</span>
          </div>
          <router-link :to="{ name: 'studio-editor', params: { projectId: p.id } }"
            class="text-sm font-bold text-slate-900 line-clamp-2 hover:text-brand-blue">{{ projectDisplayTitle(p) }}</router-link>
          <div class="text-xs text-slate-500">완료 {{ p.doneCount }} / 전체 {{ p.totalCount }}</div>
          <div class="mt-auto pt-1 flex gap-2">
            <button type="button" class="text-xs font-bold text-slate-500 hover:text-slate-900" @click="openRename(p)">이름 바꾸기</button>
            <button type="button" class="text-xs font-bold text-slate-500 hover:text-rose-600" @click="openDelete(p)">삭제</button>
          </div>
        </div>
      </article>
    </div>

    <!-- 이름 바꾸기 -->
    <StudioModal :open="renameModal.open" title="이름 바꾸기" @close="renameModal.open = false">
      <input v-model="renameModal.value" type="text" maxlength="100"
        class="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm" @keydown.enter="saveRename" />
      <p class="mt-1 text-xs text-slate-400">{{ renameModal.value.length }}/100 · 비우면 1688 원래 제목으로 보여요</p>
      <p v-if="renameModal.error" class="mt-1 text-xs font-bold text-rose-600">{{ renameModal.error }}</p>
      <template #actions>
        <button type="button" class="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold" @click="renameModal.open = false">취소</button>
        <button type="button" class="px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-bold disabled:opacity-40"
          :disabled="renameModal.saving" @click="saveRename">저장</button>
      </template>
    </StudioModal>

    <!-- 삭제 확인 -->
    <StudioModal :open="deleteModal.open" title="프로젝트를 삭제할까요?" @close="deleteModal.open = false">
      <p><b>{{ deleteModal.project ? projectDisplayTitle(deleteModal.project) : '' }}</b> 프로젝트가 목록에서 사라져요.</p>
      <p v-if="deleteModal.error" class="mt-1 text-xs font-bold text-rose-600">{{ deleteModal.error }}</p>
      <template #actions>
        <button type="button" class="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold" @click="deleteModal.open = false">취소</button>
        <button type="button" class="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-40"
          :disabled="deleteModal.saving" @click="confirmDelete">삭제</button>
      </template>
    </StudioModal>
  </div>
</template>

<script setup>
// 스튜디오 프로젝트 목록
// ★ 준비 여부는 status가 아니라 done 이미지 수로 판단한다 (1688 프로젝트 status는 'ingesting'으로 남아 있음, 실측)
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import StudioModal from '@/components/studio/StudioModal.vue'
import {
  listMyProjects, listImagesOf, signViewUrls, sortStudioImages,
  renameProject, softDeleteProject, projectDisplayTitle, expiryLabel,
} from '@/lib/studioProjects'

const projects = ref([])
const loading = ref(false)
const errorMsg = ref('')
let loadSeq = 0

function formatDate(s) {
  return s ? new Date(s).toLocaleDateString('ko-KR') : ''
}
function expiryClass(expiresAt) {
  const days = (new Date(expiresAt).getTime() - Date.now()) / 86400000
  return days <= 3 ? 'text-rose-600' : 'text-slate-500'
}

async function load() {
  const seq = ++loadSeq
  loading.value = true
  errorMsg.value = ''
  try {
    const list = await listMyProjects()
    const images = await listImagesOf(list.map(p => p.id))
    const byProject = new Map(list.map(p => [p.id, []]))
    for (const img of images) byProject.get(img.project_id)?.push(img)

    // 썸네일 = 표시 순서상 첫 done 이미지. 서명 URL은 열 때마다 한 번에 새로 발급 (10분)
    const thumbPath = new Map()
    for (const p of list) {
      const first = sortStudioImages(byProject.get(p.id)).find(i => i.ingest_status === 'done' && i.original_path)
      if (first) thumbPath.set(p.id, first.original_path)
    }
    const urls = await signViewUrls([...thumbPath.values()])
    if (seq !== loadSeq) return
    projects.value = list.map(p => {
      const imgs = byProject.get(p.id)
      return {
        ...p,
        totalCount: imgs.length,
        doneCount: imgs.filter(i => i.ingest_status === 'done').length,
        thumbUrl: urls.get(thumbPath.get(p.id)) || null,
      }
    })
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('[StudioHome] 목록 조회 실패:', e)
    errorMsg.value = e.message || String(e)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

// ── 이름 바꾸기 ──
const renameModal = reactive({ open: false, project: null, value: '', saving: false, error: '' })
function openRename(p) {
  Object.assign(renameModal, { open: true, project: p, value: p.title || '', saving: false, error: '' })
}
async function saveRename() {
  renameModal.saving = true
  renameModal.error = ''
  try {
    await renameProject(renameModal.project.id, renameModal.value)
    renameModal.project.title = renameModal.value.trim() || null
    renameModal.open = false
  } catch (e) {
    console.error('[StudioHome] 이름 바꾸기 실패:', e)
    renameModal.error = e.message
  } finally {
    renameModal.saving = false
  }
}

// ── 삭제 ──
const deleteModal = reactive({ open: false, project: null, saving: false, error: '' })
function openDelete(p) {
  Object.assign(deleteModal, { open: true, project: p, saving: false, error: '' })
}
async function confirmDelete() {
  deleteModal.saving = true
  deleteModal.error = ''
  try {
    await softDeleteProject(deleteModal.project.id)
    projects.value = projects.value.filter(p => p.id !== deleteModal.project.id)
    deleteModal.open = false
  } catch (e) {
    console.error('[StudioHome] 삭제 실패:', e)
    deleteModal.error = e.message
  } finally {
    deleteModal.saving = false
  }
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 프로젝트·서명 URL을 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    projects.value = []
    renameModal.open = false
    deleteModal.open = false
  } else {
    load() // 다른 계정으로 로그인 — 그 계정 목록으로 다시 채운다
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
