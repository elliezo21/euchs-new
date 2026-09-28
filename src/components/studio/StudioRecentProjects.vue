<template>
  <section v-if="loading || errorMsg || projects.length > 0" data-projects>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
      <h2 class="st-h-section">{{ title }}</h2>
      <div v-if="showFilters" class="flex gap-1.5" data-projects-source>
        <button
          v-for="f in SOURCE_FILTERS" :key="f.key" type="button"
          class="st-chip" :class="{ 'is-active': filter === f.key }"
          @click="filter = f.key"
        >{{ f.label }}</button>
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <slot name="link" />
        <label class="pj-search">
          <Search class="w-4 h-4 st-muted shrink-0" :stroke-width="2" />
          <input v-model="query" type="search" class="st-input-bare flex-1" placeholder="제목·1688 상품명 찾기" data-projects-search />
        </label>
        <select v-model="sort" class="st-input pj-select" aria-label="정렬" data-projects-sort>
          <option v-for="s in SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
        <div class="st-seg" role="group" aria-label="보기" data-projects-view>
          <button v-for="v in VIEWS" :key="v.key" type="button" class="st-seg-item pj-seg" :class="{ 'is-active': view === v.key }" :aria-pressed="view === v.key" :data-projects-view-pick="v.key" @click="view = v.key">
            <component :is="v.key === 'grid' ? LayoutGrid : List" class="w-4 h-4" :stroke-width="2" /> {{ v.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 폴더 (스튜디오 전용 — 고객이 직접 만든다) -->
    <div v-if="foldersReady" class="flex flex-wrap items-center gap-1.5 mb-3" data-projects-folders>
      <button type="button" class="pj-folder" :class="{ 'is-active': folder === FOLDER_ALL }" :data-projects-folder="FOLDER_ALL" @click="folder = FOLDER_ALL">전체 <span>{{ counts[FOLDER_ALL] }}</span></button>
      <button type="button" class="pj-folder" :class="{ 'is-active': folder === FOLDER_NONE }" :data-projects-folder="FOLDER_NONE" @click="folder = FOLDER_NONE">폴더 없음 <span>{{ counts[FOLDER_NONE] }}</span></button>
      <button v-for="f in folders" :key="f.id" type="button" class="pj-folder" :class="{ 'is-active': folder === f.id }" :data-projects-folder="f.id" @click="folder = f.id">
        <Folder class="w-3.5 h-3.5" :stroke-width="2" /> {{ f.name }} <span>{{ counts[f.id] || 0 }}</span>
      </button>
      <button type="button" class="pj-folder is-add" data-projects-folder-new @click="openFolderModal(null)"><FolderPlus class="w-3.5 h-3.5" :stroke-width="2" /> 폴더 만들기</button>
      <template v-if="currentFolder">
        <button type="button" class="st-link-muted text-[12px] ml-1" data-projects-folder-rename @click="openFolderModal(currentFolder)">이름 바꾸기</button>
        <button type="button" class="st-link-muted text-[12px]" :disabled="!canDeleteFolder(currentFolder.id, counts)" :title="canDeleteFolder(currentFolder.id, counts) ? '' : '비어 있는 폴더만 지울 수 있어요'" data-projects-folder-delete @click="openFolderDelete(currentFolder)">폴더 삭제</button>
      </template>
    </div>

    <!-- 여러 개 고르기 -->
    <div v-if="foldersReady && !loading && filtered.length" class="flex flex-wrap items-center gap-2 mb-3 text-[13px]" data-projects-bulk>
      <button type="button" class="st-link-muted" data-projects-select-toggle @click="toggleSelecting">{{ selecting ? '고르기 끝내기' : '여러 개 고르기' }}</button>
      <template v-if="selecting">
        <span class="st-ink font-bold">{{ selected.size }}개 고름</span>
        <button type="button" class="st-link-muted" @click="selectAllShown">보이는 것 모두</button>
        <button type="button" class="st-btn" :disabled="!selected.size" data-projects-bulk-move @click="openMove([...selected])">폴더로 이동</button>
      </template>
    </div>

    <!-- 작업 복사본 (16단계): 만드는 중 / 만들었어요 [열기] / 실패 사유 — 화면 아래 가운데에 고정 -->
    <div
      v-if="copyState.status" class="fixed left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-2 px-3 py-2 rounded-[10px] st-card st-shadow-float text-[13px] font-bold break-keep"
      style="z-index: 40; max-width: calc(100% - 32px)" role="status" :data-copy-notice="copyState.status"
    >
      <span v-if="copyState.status === 'working'" class="st-ink-2">복사본을 만드는 중이에요…</span>
      <template v-else-if="copyState.status === 'done'">
        <span class="st-ink">복사본을 만들었어요</span>
        <router-link :to="{ name: 'studio-editor', params: { projectId: copyState.projectId } }" class="st-btn st-btn-primary h-8" data-copy-open>열기</router-link>
      </template>
      <span v-else class="st-danger-text">{{ copyState.error }}</span>
      <button v-if="copyState.status !== 'working'" type="button" class="ml-auto st-link-muted text-[12px]" @click="copyState.status = ''">닫기</button>
    </div>

    <p v-if="loading" class="st-desc">불러오는 중…</p>
    <p v-else-if="errorMsg" class="text-[14px] font-bold st-danger-text">{{ errorMsg }}</p>
    <p v-else-if="filtered.length === 0" class="st-desc" data-projects-empty>{{ query.trim() ? '찾는 작업이 없어요.' : '여기에 해당하는 작업이 없어요.' }}</p>

    <!-- 격자 — 작은 카드 (폰 2 · 데스크톱 6 · 1400px 이상 8) -->
    <div v-else-if="view === 'grid'" class="st-grid-compact" data-projects-grid>
      <article v-for="p in shown" :key="p.id" class="group min-w-0" :data-project="p.id">
        <div class="relative">
          <component
            :is="selecting ? 'button' : 'router-link'" v-bind="selecting ? { type: 'button' } : { to: editorTo(p) }"
            class="pj-thumb st-border st-placeholder" :class="{ 'is-picked': selected.has(p.id) }"
            @click="selecting && togglePick(p.id)"
          >
            <img v-if="p.thumbUrl" :src="p.thumbUrl" alt="" loading="lazy" />
            <span v-else class="text-[11px]">사진 없음</span>
          </component>
          <span class="st-badge st-badge-white pj-source">{{ sourceLabel(p) }}</span>
          <span v-if="selecting" class="pj-check" :class="{ 'is-on': selected.has(p.id) }" aria-hidden="true"><Check v-if="selected.has(p.id)" class="w-3 h-3" :stroke-width="3" /></span>
          <div v-else class="absolute right-1.5 top-1.5" @click.stop>
            <button
              type="button"
              class="st-icon-btn st-surface st-shadow-float pj-more opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
              :class="{ 'opacity-100': openMenuId === p.id }"
              title="더 보기" :data-project-more="p.id"
              @click="openMenuId = openMenuId === p.id ? null : p.id"
            ><MoreHorizontal class="w-4 h-4" :stroke-width="2" /></button>
            <div v-if="openMenuId === p.id" class="absolute right-0 mt-1 w-36 st-card st-shadow-float py-1 z-10">
              <button type="button" class="pj-menu" @click="openRename(p)">이름 바꾸기</button>
              <button v-if="foldersReady" type="button" class="pj-menu" data-card-move @click="openMove([p.id])">폴더로 이동</button>
              <button type="button" class="pj-menu" :disabled="copyState.status === 'working'" data-card-copy @click="copyCard(p)">복사본 만들기</button>
              <button type="button" class="pj-menu st-danger-text" @click="openDelete(p)">삭제</button>
            </div>
          </div>
        </div>
        <router-link :to="editorTo(p)" class="mt-1.5 block text-[13px] font-bold st-ink truncate" :title="titleOf(p)">{{ titleOf(p) }}</router-link>
        <div class="st-desc-sm truncate">{{ cardMeta(p) }}</div>
      </article>
    </div>

    <!-- 목록 — 표 -->
    <div v-else class="overflow-x-auto st-card" data-projects-list>
      <table class="pj-table">
        <thead>
          <tr>
            <th v-if="selecting" class="w-8" />
            <th class="w-[64px]" />
            <th>제목</th>
            <th>출처</th>
            <th class="text-right">사진</th>
            <th>만든 날</th>
            <th>보관 남은 일</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in shown" :key="p.id" :class="{ 'is-picked': selected.has(p.id) }" :data-project="p.id">
            <td v-if="selecting"><input type="checkbox" :checked="selected.has(p.id)" :aria-label="`${titleOf(p)} 고르기`" @change="togglePick(p.id)" /></td>
            <td>
              <span class="pj-thumb48 st-border st-placeholder"><img v-if="p.thumbUrl" :src="p.thumbUrl" alt="" loading="lazy" /></span>
            </td>
            <td class="pj-title">
              <router-link :to="editorTo(p)" class="font-bold st-ink" :title="titleOf(p)">{{ titleOf(p) }}</router-link>
              <span v-if="folderName(p)" class="st-desc-sm block truncate">{{ folderName(p) }}</span>
            </td>
            <td>{{ sourceLabel(p) }}</td>
            <td class="text-right tabular-nums">{{ p.doneCount }}장</td>
            <td class="tabular-nums whitespace-nowrap">{{ dateLabel(p.created_at) }}</td>
            <td class="whitespace-nowrap">{{ keepLabel(p.expires_at) }}</td>
            <td class="whitespace-nowrap text-right">
              <div class="relative inline-flex items-center gap-1" @click.stop>
                <router-link :to="editorTo(p)" class="st-btn h-8" :data-project-open="p.id">열기</router-link>
                <button type="button" class="st-icon-btn" title="더 보기" :data-project-more="p.id" @click="openMenuId = openMenuId === p.id ? null : p.id"><MoreHorizontal class="w-4 h-4" :stroke-width="2" /></button>
                <div v-if="openMenuId === p.id" class="absolute right-0 top-full mt-1 w-36 st-card st-shadow-float py-1 z-10 text-left">
                  <button type="button" class="pj-menu" @click="openRename(p)">이름 바꾸기</button>
                  <button v-if="foldersReady" type="button" class="pj-menu" data-card-move @click="openMove([p.id])">폴더로 이동</button>
                  <button type="button" class="pj-menu" :disabled="copyState.status === 'working'" data-card-copy @click="copyCard(p)">복사본 만들기</button>
                  <button type="button" class="pj-menu st-danger-text" @click="openDelete(p)">삭제</button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && !errorMsg && !narrowed && filtered.length > firstRows" class="mt-3 text-center">
      <button type="button" class="st-link-muted text-[13px]" data-projects-more @click="showAll = !showAll">{{ showAll ? '접기' : `모두 보기 (${filtered.length}개)` }}</button>
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
      <p><b class="st-ink">{{ deleteModal.project ? titleOf(deleteModal.project) : '' }}</b> 프로젝트가 목록에서 사라져요.</p>
      <p v-if="deleteModal.error" class="mt-1 text-[12px] font-bold st-danger-text">{{ deleteModal.error }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="deleteModal.open = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" :disabled="deleteModal.saving" @click="confirmDelete">삭제</button>
      </template>
    </StudioModal>

    <!-- 폴더 만들기·이름 바꾸기 -->
    <StudioModal :open="folderModal.open" :title="folderModal.folder ? '폴더 이름 바꾸기' : '폴더 만들기'" @close="folderModal.open = false">
      <input v-model="folderModal.value" type="text" :maxlength="FOLDER_NAME_MAX" class="st-input" placeholder="폴더 이름" data-folder-name @keydown.enter="saveFolder" />
      <p class="mt-1 st-desc-sm">{{ folderModal.value.length }}/{{ FOLDER_NAME_MAX }}</p>
      <p v-if="folderModal.error" class="mt-1 text-[12px] font-bold st-danger-text" data-folder-error>{{ folderModal.error }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="folderModal.open = false">취소</button>
        <button type="button" class="st-btn st-btn-primary" :disabled="folderModal.saving" data-folder-save @click="saveFolder">저장</button>
      </template>
    </StudioModal>

    <!-- 폴더 삭제 -->
    <StudioModal :open="folderDelete.open" title="폴더를 삭제할까요?" @close="folderDelete.open = false">
      <p><b class="st-ink">{{ folderDelete.folder?.name }}</b> 폴더를 지워요. 비어 있는 폴더만 지울 수 있어요.</p>
      <p v-if="folderDelete.error" class="mt-1 text-[12px] font-bold st-danger-text">{{ folderDelete.error }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="folderDelete.open = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" :disabled="folderDelete.saving" data-folder-delete-confirm @click="confirmFolderDelete">삭제</button>
      </template>
    </StudioModal>

    <!-- 폴더로 이동 (한 개·여러 개) -->
    <StudioModal :open="moveModal.open" :title="`작업 ${moveModal.ids.length}개를 폴더로 이동`" @close="moveModal.open = false">
      <ul class="st-border rounded-[10px] st-divide overflow-hidden max-h-[46vh] overflow-y-auto" data-move-list>
        <li><button type="button" class="pj-move" :class="{ 'is-active': moveModal.target === null }" @click="moveModal.target = null">폴더 없음</button></li>
        <li v-for="f in folders" :key="f.id"><button type="button" class="pj-move" :class="{ 'is-active': moveModal.target === f.id }" :data-move-target="f.id" @click="moveModal.target = f.id"><Folder class="w-4 h-4" :stroke-width="2" /> {{ f.name }}</button></li>
      </ul>
      <button type="button" class="mt-2 st-link text-[13px]" @click="openFolderModal(null)">폴더 만들기</button>
      <p v-if="moveModal.error" class="mt-1 text-[12px] font-bold st-danger-text">{{ moveModal.error }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="moveModal.open = false">취소</button>
        <button type="button" class="st-btn st-btn-primary" :disabled="moveModal.saving" data-move-save @click="saveMove">이동</button>
      </template>
    </StudioModal>
  </section>
</template>

<script setup>
// 스튜디오 내 작업 목록 — 작업이 수백 개인 고객 기준: 작은 카드 격자 / 표 목록, 폴더, 검색, 정렬, 여러 개 골라 이동.
// 거르기·찾기·정렬·폴더 규칙은 studioProjectList.js(순수 함수), 폴더 저장은 studioFolders.js.
// 폴더는 스튜디오 전용 — 몰 카테고리·내상품리스트 카테고리와 연결하지 않는다.
// 폴더 표는 SQL(docs/sql/2026-09-28-studio-folders.sql) 실행 뒤에 생긴다 — 그 전에는 foldersReady = false, 폴더 자리를 그리지 않는다.
// ★ 준비 여부는 status가 아니라 done 이미지 수로 판단한다 (1688 프로젝트 status는 'ingesting'으로 남아 있음, 실측)
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { MoreHorizontal, Search, LayoutGrid, List, Folder, FolderPlus, Check } from 'lucide-vue-next'
import StudioModal from './StudioModal.vue'
import {
  listMyProjects, listImagesOf, signViewUrls, sortStudioImages,
  renameProject, softDeleteProject,
} from '@/lib/studioProjects'
import { copyProject } from '@/lib/studioProjectCopy'
import { listFolders, createFolder, renameFolder, deleteFolder, moveProjects } from '@/lib/studioFolders'
import {
  SOURCE_FILTERS, SORTS, VIEWS, FOLDER_ALL, FOLDER_NONE, FOLDER_NAME_MAX, FIRST_ROWS,
  titleOf, sourceLabel, filterProjects, sortProjects, folderCounts, checkFolderName, canDeleteFolder, idsToMove,
  cardMeta, keepLabel, dateLabel,
} from '@/lib/studioProjectList'

const props = defineProps({
  title: { type: String, default: '최근 작업' },
  limit: { type: Number, default: 0 },        // 처음 보이는 수 (0 = FIRST_ROWS). [모두 보기]로 전부
  showFilters: { type: Boolean, default: false },
})
const emit = defineEmits(['loaded'])

const PREF_KEY = 'studio-projects-view' // 보기·정렬 기억 (이 브라우저에만)
function readPref() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}')
    return { view: VIEWS.some(v => v.key === p.view) ? p.view : 'grid', sort: SORTS.some(s => s.key === p.sort) ? p.sort : 'updated' }
  } catch (e) {
    console.warn('[StudioRecentProjects] 보기 기억을 읽지 못함 (격자·최근 수정으로 시작):', e?.message)
    return { view: 'grid', sort: 'updated' }
  }
}
const pref = readPref()

const projects = ref([])
const folders = ref([])
const foldersReady = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const filter = ref('all')
const folder = ref(FOLDER_ALL)
const query = ref('')
const sort = ref(pref.sort)
const view = ref(pref.view)
const showAll = ref(false)
const openMenuId = ref(null)
const selecting = ref(false)
const selected = ref(new Set())
let loadSeq = 0

watch([view, sort], () => {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ view: view.value, sort: sort.value })) } catch (e) {
    console.warn('[StudioRecentProjects] 보기 기억을 저장하지 못함:', e?.message)
  }
})

const firstRows = computed(() => props.limit || FIRST_ROWS)
const counts = computed(() => folderCounts(projects.value, folders.value))
const currentFolder = computed(() => folders.value.find(f => f.id === folder.value) || null)
const filtered = computed(() => sortProjects(filterProjects(projects.value, { source: filter.value, folder: foldersReady.value ? folder.value : FOLDER_ALL, query: query.value }), sort.value))
// 찾는 중이거나 폴더를 골랐으면 전부 보인다 (찾은 것이 [모두 보기] 뒤에 숨지 않게)
const narrowed = computed(() => !!query.value.trim() || (foldersReady.value && folder.value !== FOLDER_ALL))
const shown = computed(() => (showAll.value || narrowed.value ? filtered.value : filtered.value.slice(0, firstRows.value)))
const editorTo = p => ({ name: 'studio-editor', params: { projectId: p.id } })
const folderName = p => folders.value.find(f => f.id === p.folder_id)?.name || ''

async function load() {
  const seq = ++loadSeq
  loading.value = true
  errorMsg.value = ''
  try {
    const [list, fo] = await Promise.all([listMyProjects(), listFolders()])
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
    foldersReady.value = fo.ready
    folders.value = fo.folders
    if (folder.value !== FOLDER_ALL && folder.value !== FOLDER_NONE && !fo.folders.some(f => f.id === folder.value)) folder.value = FOLDER_ALL
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

// ── 여러 개 고르기 ──
function toggleSelecting() {
  selecting.value = !selecting.value
  selected.value = new Set()
  openMenuId.value = null
}
function togglePick(id) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  selected.value = next
}
function selectAllShown() { selected.value = new Set(shown.value.map(p => p.id)) }

// ── 폴더 ──
const folderModal = reactive({ open: false, folder: null, value: '', saving: false, error: '' })
function openFolderModal(f) {
  Object.assign(folderModal, { open: true, folder: f, value: f?.name || '', saving: false, error: '' })
}
async function saveFolder() {
  const c = checkFolderName(folderModal.value, folders.value, folderModal.folder?.id || null)
  if (!c.ok) { folderModal.error = c.message; return }
  folderModal.saving = true
  folderModal.error = ''
  try {
    if (folderModal.folder) {
      await renameFolder(folderModal.folder.id, c.name)
      folders.value = folders.value.map(f => (f.id === folderModal.folder.id ? { ...f, name: c.name } : f))
    } else {
      const made = await createFolder(c.name, folders.value.length)
      folders.value = [...folders.value, made]
      if (moveModal.open) moveModal.target = made.id // 이동 창에서 만들었으면 바로 그 폴더를 고른다
    }
    folderModal.open = false
  } catch (e) {
    console.error('[StudioRecentProjects] 폴더 저장 실패:', e)
    folderModal.error = e.message
  } finally {
    folderModal.saving = false
  }
}
const folderDelete = reactive({ open: false, folder: null, saving: false, error: '' })
function openFolderDelete(f) {
  if (!canDeleteFolder(f.id, counts.value)) return
  Object.assign(folderDelete, { open: true, folder: f, saving: false, error: '' })
}
async function confirmFolderDelete() {
  folderDelete.saving = true
  folderDelete.error = ''
  try {
    await deleteFolder(folderDelete.folder.id)
    folders.value = folders.value.filter(f => f.id !== folderDelete.folder.id)
    folder.value = FOLDER_ALL
    folderDelete.open = false
  } catch (e) {
    console.error('[StudioRecentProjects] 폴더 삭제 실패:', e)
    folderDelete.error = e.message
  } finally {
    folderDelete.saving = false
  }
}
const moveModal = reactive({ open: false, ids: [], target: null, saving: false, error: '' })
function openMove(ids) {
  openMenuId.value = null
  if (!ids.length) return
  const first = projects.value.find(p => p.id === ids[0])
  Object.assign(moveModal, { open: true, ids, target: ids.length === 1 ? first?.folder_id || null : null, saving: false, error: '' })
}
async function saveMove() {
  const ids = idsToMove(projects.value, moveModal.ids, moveModal.target)
  if (!ids.length) { moveModal.open = false; return }
  moveModal.saving = true
  moveModal.error = ''
  try {
    await moveProjects(ids, moveModal.target)
    const moved = new Set(ids)
    projects.value = projects.value.map(p => (moved.has(p.id) ? { ...p, folder_id: moveModal.target } : p))
    moveModal.open = false
    selecting.value = false
    selected.value = new Set()
  } catch (e) {
    console.error('[StudioRecentProjects] 폴더로 이동 실패:', e)
    moveModal.error = e.message
  } finally {
    moveModal.saving = false
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
    const t = renameModal.value.trim() || null
    projects.value = projects.value.map(p => (p.id === renameModal.project.id ? { ...p, title: t } : p))
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

// ── 복사본 만들기 (16단계) — 확인 없이 바로. 서버가 사진·지운 결과까지 새 작업으로 복사한다 (studioProjectCopy) ──
const copyState = reactive({ status: '', projectId: null, error: '' }) // status: '' | 'working' | 'done' | 'failed'
async function copyCard(p) {
  openMenuId.value = null
  if (copyState.status === 'working') return
  Object.assign(copyState, { status: 'working', projectId: null, error: '' })
  try {
    const r = await copyProject(p.id)
    Object.assign(copyState, { status: 'done', projectId: r.projectId })
    load() // 새 카드가 목록에 보이게
  } catch (e) {
    console.error('[StudioRecentProjects] 복사본 만들기 실패:', e)
    Object.assign(copyState, { status: 'failed', error: e.message })
  }
}

const closeMenu = () => { openMenuId.value = null }

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 프로젝트·폴더·서명 URL을 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    projects.value = []
    folders.value = []
    foldersReady.value = false
    folder.value = FOLDER_ALL
    query.value = ''
    selecting.value = false
    selected.value = new Set()
    renameModal.open = false
    deleteModal.open = false
    folderModal.open = false
    folderDelete.open = false
    moveModal.open = false
    Object.assign(copyState, { status: '', projectId: null, error: '' })
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

<style scoped>
.pj-search { display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 10px; width: 220px; max-width: 100%; border-radius: 9px; background: var(--st-surface); border: 1px solid var(--st-line-strong); }
.pj-search:focus-within { border-color: var(--st-accent); box-shadow: 0 0 0 3px var(--st-accent-ring); }
.pj-select { height: 36px; width: auto; padding: 0 10px; font-size: 13px; }
.pj-seg { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 10px; font-size: 12px; }
.pj-folder { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 11px; border-radius: 8px; font-size: 13px; font-weight: 700; color: var(--st-ink-2); background: var(--st-surface); border: 1px solid var(--st-line-strong); }
.pj-folder span { font-size: 11px; font-weight: 700; color: var(--st-muted); }
.pj-folder:hover { border-color: var(--st-accent); }
.pj-folder.is-active { color: var(--st-accent); border-color: var(--st-accent); background: var(--st-accent-soft); }
.pj-folder.is-active span { color: var(--st-accent); }
.pj-folder.is-add { border-style: dashed; color: var(--st-muted); }
.pj-thumb { display: flex; align-items: center; justify-content: center; width: 100%; aspect-ratio: 1 / 1; overflow: hidden; border-radius: 10px; }
.pj-thumb img { width: 100%; height: 100%; object-fit: cover; }
.pj-thumb.is-picked { outline: 2px solid var(--st-accent); outline-offset: 1px; }
.pj-source { position: absolute; left: 6px; top: 6px; height: 18px; padding: 0 6px; font-size: 10px; }
.pj-more { width: 26px; height: 26px; }
.pj-check { position: absolute; right: 6px; top: 6px; width: 18px; height: 18px; border-radius: 5px; display: flex; align-items: center; justify-content: center; background: var(--st-surface); border: 1.5px solid var(--st-line-strong); color: var(--st-on-accent); pointer-events: none; }
.pj-check.is-on { background: var(--st-accent); border-color: var(--st-accent); }
.pj-menu { display: block; width: 100%; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 600; color: var(--st-ink-2); }
.pj-menu:hover:not(:disabled) { background: var(--st-soft); }
.pj-menu.st-danger-text { color: var(--st-danger); }
.pj-table { width: 100%; border-collapse: collapse; font-size: 13px; color: var(--st-ink-2); }
.pj-table th { padding: 9px 10px; text-align: left; font-size: 12px; font-weight: 700; color: var(--st-muted); white-space: nowrap; border-bottom: 1px solid var(--st-line); }
.pj-table th.text-right { text-align: right; }
.pj-table td { padding: 7px 10px; vertical-align: middle; border-bottom: 1px solid var(--st-line); }
.pj-table tr:last-child td { border-bottom: 0; }
.pj-table tr.is-picked td { background: var(--st-accent-soft); }
.pj-title { max-width: 360px; }
.pj-title a { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pj-thumb48 { display: block; width: 48px; height: 48px; border-radius: 7px; overflow: hidden; }
.pj-thumb48 img { width: 100%; height: 100%; object-fit: cover; }
.pj-move { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 10px 14px; font-size: 14px; font-weight: 600; color: var(--st-ink-2); background: var(--st-surface); }
.pj-move:hover { background: var(--st-soft); }
.pj-move.is-active { color: var(--st-accent); background: var(--st-accent-soft); }
</style>
