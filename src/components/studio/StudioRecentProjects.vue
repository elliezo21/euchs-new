<template>
  <section v-if="loading || errorMsg || visibleSource.length > 0">
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <h2 class="st-h-section">{{ title }}</h2>
      <div v-if="showFilters" class="flex gap-1.5">
        <button
          v-for="f in FILTERS" :key="f.key" type="button"
          class="st-chip" :class="{ 'is-active': filter === f.key }"
          @click="filter = f.key"
        >{{ f.label }}</button>
      </div>
      <div class="ml-auto">
        <slot name="link">
          <button
            v-if="limit && filtered.length > limit"
            type="button" class="st-link-muted text-[13px]"
            @click="showAll = !showAll"
          >{{ showAll ? '접기' : '모두 보기' }}</button>
        </slot>
      </div>
    </div>

    <p v-if="loading" class="st-desc">불러오는 중…</p>
    <p v-else-if="errorMsg" class="text-[14px] font-bold st-danger-text">{{ errorMsg }}</p>
    <p v-else-if="filtered.length === 0" class="st-desc">이 종류의 작업은 아직 없어요.</p>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <article v-for="p in shown" :key="p.id" class="group min-w-0">
        <div class="relative">
          <router-link
            :to="{ name: 'studio-editor', params: { projectId: p.id } }"
            class="block h-[228px] overflow-hidden rounded-[14px] st-border st-placeholder"
          >
            <img v-if="p.thumbUrl" :src="p.thumbUrl" alt="" class="w-full h-full object-cover" />
            <span v-else class="text-[13px]">사진 준비 중</span>
          </router-link>
          <span class="st-badge st-badge-white absolute left-2.5 top-2.5">{{ p.source_type === 'upload' ? '내 사진' : '1688' }}</span>
          <!-- ⋯ 메뉴 (hover·포커스 때 보임) -->
          <div class="absolute right-2 top-2" @click.stop>
            <button
              type="button"
              class="st-icon-btn st-surface st-shadow-float opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
              :class="{ 'opacity-100': openMenuId === p.id }"
              title="더 보기"
              @click="openMenuId = openMenuId === p.id ? null : p.id"
            ><MoreHorizontal class="w-4 h-4" :stroke-width="2" /></button>
            <div v-if="openMenuId === p.id" class="absolute right-0 mt-1 w-36 st-card st-shadow-float py-1 z-10">
              <button type="button" class="w-full text-left px-3 py-2 text-[14px] font-semibold st-ink-2 st-hover-soft" @click="openRename(p)">이름 바꾸기</button>
              <button type="button" class="w-full text-left px-3 py-2 text-[14px] font-semibold st-danger-text st-hover-soft" @click="openDelete(p)">삭제</button>
            </div>
          </div>
        </div>
        <div class="mt-2.5 flex items-baseline gap-2 min-w-0">
          <router-link
            :to="{ name: 'studio-editor', params: { projectId: p.id } }"
            class="text-[14px] font-bold st-ink truncate"
          >{{ projectDisplayTitle(p) }}</router-link>
          <button v-if="!p.title && p.title_zh" type="button" class="shrink-0 st-link text-[12px]" @click="openRename(p)">이름 정하기</button>
        </div>
        <div class="mt-0.5 st-desc-sm">사진 {{ p.doneCount }}장 · {{ createdLabel(p.created_at) }} · {{ keepLabel(p.expires_at) }}</div>
      </article>
    </div>

    <!-- 이름 바꾸기 -->
    <StudioModal :open="renameModal.open" title="이름 바꾸기" @close="renameModal.open = false">
      <input v-model="renameModal.value" type="text" maxlength="100" class="st-input" @keydown.enter="saveRename" />
      <p class="mt-1 st-desc-sm">{{ renameModal.value.length }}/100 · 비우면 1688 원래 제목으로 보여요</p>
      <p v-if="renameModal.error" class="mt-1 text-[12px] font-bold st-danger-text">{{ renameModal.error }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="renameModal.open = false">취소</button>
        <button type="button" class="st-btn st-btn-primary" :disabled="renameModal.saving" @click="saveRename">저장</button>
      </template>
    </StudioModal>

    <!-- 삭제 확인 -->
    <StudioModal :open="deleteModal.open" title="프로젝트를 삭제할까요?" @close="deleteModal.open = false">
      <p><b class="st-ink">{{ deleteModal.project ? projectDisplayTitle(deleteModal.project) : '' }}</b> 프로젝트가 목록에서 사라져요.</p>
      <p v-if="deleteModal.error" class="mt-1 text-[12px] font-bold st-danger-text">{{ deleteModal.error }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="deleteModal.open = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" :disabled="deleteModal.saving" @click="confirmDelete">삭제</button>
      </template>
    </StudioModal>
  </section>
</template>

<script setup>
// 스튜디오 최근 작업 카드 목록 — 대문(이어서 작업하기)과 내 작업(최근 작업)이 같이 쓴다.
// (1-6a StudioHomeView의 목록 조회·이름 바꾸기·삭제 로직을 그대로 옮김)
// ★ 준비 여부는 status가 아니라 done 이미지 수로 판단한다 (1688 프로젝트 status는 'ingesting'으로 남아 있음, 실측)
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { MoreHorizontal } from 'lucide-vue-next'
import StudioModal from './StudioModal.vue'
import {
  listMyProjects, listImagesOf, signViewUrls, sortStudioImages,
  renameProject, softDeleteProject, projectDisplayTitle,
} from '@/lib/studioProjects'

const props = defineProps({
  title: { type: String, default: '최근 작업' },
  limit: { type: Number, default: 0 },        // 0 = 전부
  showFilters: { type: Boolean, default: false },
})
const emit = defineEmits(['loaded'])

const FILTERS = [{ key: 'all', label: '전체' }, { key: '1688', label: '1688' }, { key: 'upload', label: '내 사진' }]
const projects = ref([])
const loading = ref(false)
const errorMsg = ref('')
const filter = ref('all')
const showAll = ref(false)
const openMenuId = ref(null)
let loadSeq = 0

const visibleSource = projects // 목록이 비면 섹션 자체를 숨긴다 (시작하기만 보이게)
const filtered = computed(() => filter.value === 'all' ? projects.value : projects.value.filter(p => p.source_type === filter.value))
const shown = computed(() => (props.limit && !showAll.value ? filtered.value.slice(0, props.limit) : filtered.value))

function daysBetween(a, b) {
  const d = x => { const t = new Date(x); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) }
  return Math.round((d(b) - d(a)) / 86400000)
}
// 조회 함수(listMyProjects)가 updated_at을 가져오지 않아 "수정"이 아니라 만든 날짜 기준으로 표시한다
function createdLabel(createdAt) {
  const n = daysBetween(createdAt, new Date())
  return n <= 0 ? '오늘 만듦' : n === 1 ? '어제 만듦' : `${n}일 전 만듦`
}
function keepLabel(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (!Number.isFinite(ms)) return ''
  if (ms <= 0) return '보관 기간 끝남'
  const days = Math.floor(ms / 86400000)
  return days === 0 ? '오늘까지 보관' : `보관 ${days}일 남음`
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
    emit('loaded', projects.value.length)
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('[StudioRecentProjects] 목록 조회 실패:', e)
    errorMsg.value = e.message || String(e)
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

// ── 이름 바꾸기 ──
const renameModal = reactive({ open: false, project: null, value: '', saving: false, error: '' })
function openRename(p) {
  openMenuId.value = null
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
    console.error('[StudioRecentProjects] 이름 바꾸기 실패:', e)
    renameModal.error = e.message
  } finally {
    renameModal.saving = false
  }
}

// ── 삭제 ──
const deleteModal = reactive({ open: false, project: null, saving: false, error: '' })
function openDelete(p) {
  openMenuId.value = null
  Object.assign(deleteModal, { open: true, project: p, saving: false, error: '' })
}
async function confirmDelete() {
  deleteModal.saving = true
  deleteModal.error = ''
  try {
    await softDeleteProject(deleteModal.project.id)
    projects.value = projects.value.filter(p => p.id !== deleteModal.project.id)
    deleteModal.open = false
    emit('loaded', projects.value.length)
  } catch (e) {
    console.error('[StudioRecentProjects] 삭제 실패:', e)
    deleteModal.error = e.message
  } finally {
    deleteModal.saving = false
  }
}

const closeMenu = () => { openMenuId.value = null }

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 프로젝트·서명 URL을 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    projects.value = []
    renameModal.open = false
    deleteModal.open = false
    emit('loaded', 0)
  } else {
    load() // 다른 계정으로 로그인 — 그 계정 목록으로 다시 채운다
  }
}

onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  document.addEventListener('click', closeMenu)
  load()
})

onUnmounted(() => {
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
  document.removeEventListener('click', closeMenu)
})

defineExpose({ reload: load })
</script>
