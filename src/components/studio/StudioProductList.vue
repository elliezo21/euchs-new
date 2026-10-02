<template>
  <section data-products>
    <!-- 탭 (개수) · 찾기 · 정렬 -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
      <div class="flex flex-wrap gap-1.5" role="tablist" data-products-tabs>
        <button
          v-for="t in PRODUCT_TABS" :key="t.key" type="button" role="tab" class="pl-tab" :class="{ 'is-active': tab === t.key }" :aria-selected="tab === t.key"
          :data-products-tab="t.key" @click="tab = t.key"
        >{{ t.label }} <span class="pl-count" :class="{ 'is-alert': t.alert && counts[t.key] > 0 }" :data-products-count="t.key">{{ counts[t.key] }}</span></button>
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <label class="pl-search">
          <Search class="w-4 h-4 st-muted shrink-0" :stroke-width="2" />
          <input v-model="query" type="search" class="st-input-bare flex-1" placeholder="상품명·1688 상품번호 찾기" data-products-search />
        </label>
        <select v-model="sort" class="st-input pl-select" aria-label="정렬" data-products-sort>
          <option v-for="s in SORTS" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
        <button type="button" class="st-link-muted text-[13px]" data-products-reload @click="load">새로고침</button>
      </div>
    </div>

    <!-- 폴더 (스튜디오 전용 — 고객이 직접 만든다) -->
    <div v-if="foldersReady" class="flex flex-wrap items-center gap-1.5 mb-3" data-projects-folders>
      <button type="button" class="pl-folder" :class="{ 'is-active': folder === FOLDER_ALL }" :data-projects-folder="FOLDER_ALL" @click="folder = FOLDER_ALL">전체 <span>{{ folderCountsOf[FOLDER_ALL] }}</span></button>
      <button type="button" class="pl-folder" :class="{ 'is-active': folder === FOLDER_NONE }" :data-projects-folder="FOLDER_NONE" @click="folder = FOLDER_NONE">폴더 없음 <span>{{ folderCountsOf[FOLDER_NONE] }}</span></button>
      <button v-for="f in folders" :key="f.id" type="button" class="pl-folder" :class="{ 'is-active': folder === f.id }" :data-projects-folder="f.id" @click="folder = f.id">
        <Folder class="w-3.5 h-3.5" :stroke-width="2" /> {{ f.name }} <span>{{ folderCountsOf[f.id] || 0 }}</span>
      </button>
      <button type="button" class="pl-folder is-add" data-projects-folder-new @click="openFolderModal(null)"><FolderPlus class="w-3.5 h-3.5" :stroke-width="2" /> 폴더 만들기</button>
      <template v-if="currentFolder">
        <button type="button" class="st-link-muted text-[12px] ml-1" data-projects-folder-rename @click="openFolderModal(currentFolder)">이름 바꾸기</button>
        <button type="button" class="st-link-muted text-[12px]" :disabled="!canDeleteFolder(currentFolder.id, folderCountsOf)" :title="canDeleteFolder(currentFolder.id, folderCountsOf) ? '' : '비어 있는 폴더만 삭제할 수 있습니다'" data-projects-folder-delete @click="openFolderDelete(currentFolder)">폴더 삭제</button>
      </template>
    </div>

    <p v-if="sendsError" class="mb-2 text-[13px] font-bold st-danger-text break-keep" data-products-sends-error>{{ sendsError }}</p>
    <p v-if="message" class="mb-2 text-[13px] font-bold break-keep" :class="messageError ? 'st-danger-text' : 'st-success-text'" data-products-msg>{{ message }}
      <router-link v-if="!messageError" :to="{ name: 'studio-channels-sent' }" class="st-link ml-1">전송 기록 보기</router-link></p>

    <p v-if="loading && !rows.length" class="st-desc">불러오는 중…</p>
    <p v-else-if="errorMsg" class="text-[14px] font-bold st-danger-text break-keep" data-products-error>{{ errorMsg }}</p>
    <p v-else-if="!rows.length" class="st-desc break-keep" data-products-none>위 [새 상품 만들기]에서 상품을 만들면 여기에 모입니다.</p>
    <p v-else-if="!shown.length" class="st-desc" data-products-empty>{{ query.trim() ? '찾는 상품이 없습니다.' : '여기에 해당하는 상품이 없습니다.' }}</p>

    <template v-else>
      <!-- 넓은 화면 — 한 줄: 체크 | 상품 | 판매처 현황 | 할 일 | 수정일 -->
      <div class="pl-table-wrap st-card" data-products-table>
        <table class="pl-table">
          <thead>
            <tr>
              <th class="w-[44px]"><input type="checkbox" :checked="allPicked" :indeterminate.prop="somePicked && !allPicked" :disabled="!pickable.length" aria-label="보이는 상품 모두 고르기" data-products-check-all @change="pickAll($event.target.checked)" /></th>
              <th>상품</th>
              <th>판매처 현황</th>
              <th class="w-[150px]">할 일</th>
              <th class="w-[96px]">수정일</th>
              <th class="w-[44px]" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in shown" :key="r.id" :class="{ 'is-picked': picked.has(r.id) }" :data-product="r.id" :data-product-stage="r.stage">
              <td>
                <span :title="canPick(r) ? '' : DRAFT_LOCK_NOTE">
                  <input type="checkbox" :checked="picked.has(r.id)" :disabled="!canPick(r)" :aria-label="`${r.name} 보내기 고르기`" :data-product-check="r.id" @change="togglePick(r)" />
                </span>
              </td>
              <td>
                <div class="flex items-center gap-3 min-w-0">
                  <router-link :to="editorTo(r)" class="pl-thumb st-border st-placeholder shrink-0" :aria-label="`${r.name} 편집`">
                    <img v-if="thumbOf(r)" :src="thumbOf(r)" alt="" loading="lazy" />
                  </router-link>
                  <div class="min-w-0">
                    <router-link :to="editorTo(r)" class="block text-[14px] font-bold st-ink truncate hover:underline" :title="r.name" :data-product-name="r.id">{{ r.name }}</router-link>
                    <div class="mt-1 flex flex-wrap items-center gap-1.5">
                      <span :class="STAGE_BADGE[r.stage]" :data-product-stage-badge="r.stage">{{ STAGE_LABEL[r.stage] }}</span>
                      <span class="st-desc-sm">{{ r.source }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div class="flex flex-wrap gap-1" :data-product-chips="r.id">
                  <template v-if="chipsOf(r).chips.length">
                    <button v-for="c in chipsOf(r).chips" :key="c.market" type="button" class="pl-chip" :class="`is-${c.tone}`" :title="c.title || undefined" :data-product-chip="c.market" @click="gotoSent(c.id)">{{ c.label }}</button>
                    <span v-if="chipsOf(r).more" class="pl-chip is-more" :title="chipsOf(r).more.title">{{ chipsOf(r).more.label }}</span>
                  </template>
                  <span v-else-if="r.stage !== 'draft'" class="pl-chip" data-product-chip-none>{{ NOT_SENT_CHIP }}</span>
                  <span v-else class="st-muted text-[12px]">—</span>
                </div>
              </td>
              <td>
                <button type="button" class="st-btn pl-act" :class="actionOf(r).key === 'edit' ? '' : 'st-btn-primary'" :disabled="!!opening" :data-product-action="actionOf(r).key" @click="runAction(r)">{{ opening === r.id ? '여는 중…' : actionOf(r).label }}</button>
              </td>
              <td class="tabular-nums whitespace-nowrap st-ink-2 text-[13px]">{{ dateLabel(r.updatedAt) }}</td>
              <td>
                <div class="relative" @click.stop>
                  <button type="button" class="st-icon-btn" title="더 보기" :data-product-more="r.id" @click="openMenuId = openMenuId === r.id ? null : r.id"><MoreHorizontal class="w-4 h-4" :stroke-width="2" /></button>
                  <div v-if="openMenuId === r.id" class="absolute right-0 top-full mt-1 w-40 st-card st-shadow-float py-1 z-10 text-left">
                    <router-link :to="editorTo(r)" class="pl-menu">편집 열기</router-link>
                    <button type="button" class="pl-menu" @click="openRename(r)">이름 바꾸기</button>
                    <button v-if="foldersReady" type="button" class="pl-menu" data-card-move @click="openMove([r.id])">폴더로 이동</button>
                    <button type="button" class="pl-menu" :disabled="copyState.status === 'working'" data-card-copy @click="copyCard(r)">복사본 만들기</button>
                    <button v-if="r.exportId" type="button" class="pl-menu" :disabled="busy[r.id]?.running" :data-product-redownload="r.id" @click="redownload(r)">이미지 다시 받기</button>
                    <button type="button" class="pl-menu st-danger-text" @click="openDelete(r)">삭제</button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 폰(768px 미만) — 카드 목록, 버튼 44px 이상 -->
      <ul class="pl-cards" data-products-cards>
        <li v-for="r in shown" :key="r.id" class="pl-card st-card" :class="{ 'is-picked': picked.has(r.id) }" :data-product-card="r.id">
          <div class="flex items-start gap-3">
            <label class="pl-card-check" :title="canPick(r) ? '' : DRAFT_LOCK_NOTE">
              <input type="checkbox" :checked="picked.has(r.id)" :disabled="!canPick(r)" :aria-label="`${r.name} 보내기 고르기`" @change="togglePick(r)" />
            </label>
            <router-link :to="editorTo(r)" class="pl-thumb st-border st-placeholder shrink-0" :aria-label="`${r.name} 편집`"><img v-if="thumbOf(r)" :src="thumbOf(r)" alt="" loading="lazy" /></router-link>
            <div class="min-w-0 flex-1">
              <router-link :to="editorTo(r)" class="block text-[15px] font-bold st-ink break-keep">{{ r.name }}</router-link>
              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                <span :class="STAGE_BADGE[r.stage]">{{ STAGE_LABEL[r.stage] }}</span>
                <span class="st-desc-sm">{{ r.source }} · {{ dateLabel(r.updatedAt) }}</span>
              </div>
            </div>
            <div class="relative" @click.stop>
              <button type="button" class="st-icon-btn pl-tap" title="더 보기" @click="openMenuId = openMenuId === `m:${r.id}` ? null : `m:${r.id}`"><MoreHorizontal class="w-4 h-4" :stroke-width="2" /></button>
              <div v-if="openMenuId === `m:${r.id}`" class="absolute right-0 top-full mt-1 w-40 st-card st-shadow-float py-1 z-10 text-left">
                <button type="button" class="pl-menu pl-tap" @click="openRename(r)">이름 바꾸기</button>
                <button v-if="foldersReady" type="button" class="pl-menu pl-tap" @click="openMove([r.id])">폴더로 이동</button>
                <button type="button" class="pl-menu pl-tap" :disabled="copyState.status === 'working'" @click="copyCard(r)">복사본 만들기</button>
                <button v-if="r.exportId" type="button" class="pl-menu pl-tap" :disabled="busy[r.id]?.running" @click="redownload(r)">이미지 다시 받기</button>
                <button type="button" class="pl-menu pl-tap st-danger-text" @click="openDelete(r)">삭제</button>
              </div>
            </div>
          </div>
          <div class="mt-2 flex flex-wrap gap-1">
            <template v-if="chipsOf(r).chips.length">
              <button v-for="c in chipsOf(r).chips" :key="c.market" type="button" class="pl-chip" :class="`is-${c.tone}`" :title="c.title || undefined" @click="gotoSent(c.id)">{{ c.label }}</button>
              <span v-if="chipsOf(r).more" class="pl-chip is-more" :title="chipsOf(r).more.title">{{ chipsOf(r).more.label }}</span>
            </template>
            <span v-else-if="r.stage !== 'draft'" class="pl-chip">{{ NOT_SENT_CHIP }}</span>
          </div>
          <button type="button" class="st-btn st-btn-block pl-tap mt-2" :class="actionOf(r).key === 'edit' ? '' : 'st-btn-primary'" :disabled="!!opening" @click="runAction(r)">{{ opening === r.id ? '여는 중…' : actionOf(r).label }}</button>
        </li>
      </ul>

      <p v-for="(b, id) in busyMessages" :key="id" class="mt-1 text-[12px] font-bold break-keep" :class="b.error ? 'st-danger-text' : 'st-muted'" :data-export-msg="id">{{ b.name }} · {{ b.message }}</p>
    </template>

    <!-- 고른 상품 아래 막대 -->
    <div v-if="pickedRows.length" class="pl-bar st-card st-shadow-float" role="region" aria-label="고른 상품" data-products-bar>
      <span class="text-[14px] font-bold st-ink" data-products-bar-count>{{ summary.total }}개 선택됨</span>
      <span class="st-desc-sm" data-products-bar-kinds>새로 보내기 {{ summary.fresh }} · 변경사항 전송 {{ summary.update }}</span>
      <span class="flex-1" />
      <button type="button" class="st-link-muted text-[13px] pl-tap" @click="clearPicks">선택 해제</button>
      <button v-if="foldersReady" type="button" class="st-btn pl-tap" data-projects-bulk-move @click="openMove(pickedRows.map(r => r.id))">폴더로 이동</button>
      <span v-if="summary.total > BULK_MAX" class="text-[12px] font-bold st-danger-text" data-products-bar-max>한 번에 {{ BULK_MAX }}개까지 보낼 수 있습니다</span>
      <button type="button" class="st-btn st-btn-primary pl-tap" :disabled="!canSendPicked || !!opening" data-products-bar-send @click="sendPicked">판매처로 보내기</button>
    </div>

    <!-- 작업 복사본 — 화면 아래 가운데 -->
    <div
      v-if="copyState.status" class="fixed left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-2 px-3 py-2 rounded-[10px] st-card st-shadow-float text-[13px] font-bold break-keep"
      style="z-index: 41; max-width: calc(100% - 32px)" role="status" :data-copy-notice="copyState.status"
    >
      <span v-if="copyState.status === 'working'" class="st-ink-2">복사본을 만드는 중입니다…</span>
      <template v-else-if="copyState.status === 'done'">
        <span class="st-ink">복사본을 만들었습니다</span>
        <router-link :to="{ name: 'studio-editor', params: { projectId: copyState.projectId } }" class="st-btn st-btn-primary h-8" data-copy-open>열기</router-link>
      </template>
      <span v-else class="st-danger-text">{{ copyState.error }}</span>
      <button v-if="copyState.status !== 'working'" type="button" class="ml-auto st-link-muted text-[12px]" @click="copyState.status = ''">닫기</button>
    </div>

    <!-- 이름 바꾸기 -->
    <StudioModal :open="renameModal.open" title="이름 바꾸기" @close="renameModal.open = false">
      <input v-model="renameModal.value" type="text" maxlength="100" class="st-input" @keydown.enter="saveRename" />
      <p class="mt-1 st-desc-sm">{{ renameModal.value.length }}/100 · 비우면 1688 원래 제목으로 표시됩니다</p>
      <p v-if="renameModal.error" class="mt-1 text-[12px] font-bold st-danger-text">{{ renameModal.error }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="renameModal.open = false">취소</button>
        <button type="button" class="st-btn st-btn-primary" :disabled="renameModal.saving" @click="saveRename">저장</button>
      </template>
    </StudioModal>

    <!-- 삭제 확인 -->
    <StudioModal :open="deleteModal.open" title="상품을 삭제할까요?" @close="deleteModal.open = false">
      <p><b class="st-ink">{{ deleteModal.row?.name }}</b> 상품이 목록에서 사라집니다. 판매처에 올라간 상품은 판매처에서 따로 정리해야 합니다.</p>
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
      <p><b class="st-ink">{{ folderDelete.folder?.name }}</b> 폴더를 삭제합니다. 비어 있는 폴더만 삭제할 수 있습니다.</p>
      <p v-if="folderDelete.error" class="mt-1 text-[12px] font-bold st-danger-text">{{ folderDelete.error }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="folderDelete.open = false">취소</button>
        <button type="button" class="st-btn st-btn-danger" :disabled="folderDelete.saving" data-folder-delete-confirm @click="confirmFolderDelete">삭제</button>
      </template>
    </StudioModal>

    <!-- 폴더로 이동 -->
    <StudioModal :open="moveModal.open" :title="`상품 ${moveModal.ids.length}개를 폴더로 이동`" @close="moveModal.open = false">
      <ul class="st-border rounded-[10px] st-divide overflow-hidden max-h-[46vh] overflow-y-auto" data-move-list>
        <li><button type="button" class="pl-move" :class="{ 'is-active': moveModal.target === null }" @click="moveModal.target = null">폴더 없음</button></li>
        <li v-for="f in folders" :key="f.id"><button type="button" class="pl-move" :class="{ 'is-active': moveModal.target === f.id }" :data-move-target="f.id" @click="moveModal.target = f.id"><Folder class="w-4 h-4" :stroke-width="2" /> {{ f.name }}</button></li>
      </ul>
      <button type="button" class="mt-2 st-link text-[13px]" @click="openFolderModal(null)">폴더 만들기</button>
      <p v-if="moveModal.error" class="mt-1 text-[12px] font-bold st-danger-text">{{ moveModal.error }}</p>
      <template #actions>
        <button type="button" class="st-btn" @click="moveModal.open = false">취소</button>
        <button type="button" class="st-btn st-btn-primary" :disabled="moveModal.saving" data-move-save @click="saveMove">이동</button>
      </template>
    </StudioModal>

    <!-- 보내기 창 (상품 하나) — 예전 보내기 탭·보낸 상품의 [수정 후 재전송]과 같은 창·같은 진입(sendToMarketplace / resendToMarketplace) -->
    <StudioSendModal :open="send.open" :prepare="send.prepare" :market="send.market" :load-error="send.error" :sent="sentOfOpen" @close="send.open = false" @sent="onSent" @retry="loadPrepare" />
    <!-- 여러 상품 한 번에 보내기 (2개 이상 골랐을 때) — 열 때마다 새로 만든다 -->
    <StudioBulkSendModal v-if="bulk.open" :open="bulk.open" :rows="bulk.rows" @close="bulk.open = false" @sent="loadSends" />
  </section>
</template>

<script setup>
// [내 상품] 목록 (2026-10-02) — 한 줄 = 작업 하나(규칙·근거 src/lib/studioProductList.js). 예전 [내 작업] 최근 작업 + 내 상품 카드 + 판매처 > 보내기 탭의 상품 고르기를 합쳤다.
// 상품 이름 = 편집 열기 · 체크 = 보내기 고르기(작성 중은 고를 수 없음) · 할 일 버튼 하나(이어서 편집 / 판매처로 보내기 / 변경사항 전송 / 수정 후 재전송)
// 판매처 현황 칩은 보낸 상품 목록과 같은 함수(studioSentList.marketChips) — 누르면 [판매처 > 전송 기록]의 그 줄로
// 폴더·이름 바꾸기·복사본·삭제는 예전 [내 작업] 목록(StudioRecentProjects)과 같은 함수를 쓴다
// 주소 ?send=<결과물 id> = 그 상품의 보내기 창을 연다(편집기 [작업 저장] 뒤 [판매처로 보내기] · 예전 /studio/channels/send?export= 주소)
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MoreHorizontal, Search, Folder, FolderPlus } from 'lucide-vue-next'
import StudioModal from './StudioModal.vue'
import StudioSendModal from './StudioSendModal.vue'
import StudioBulkSendModal from './StudioBulkSendModal.vue'
import { BULK_MAX } from '@/lib/studioBulkSend'
import { loadMarketLinks } from '@/lib/studioMarketLinks'
import { listMyProjects, listImagesOf, signViewUrls, sortStudioImages, renameProject, softDeleteProject } from '@/lib/studioProjects'
import { copyProject } from '@/lib/studioProjectCopy'
import { listFolders, createFolder, renameFolder, deleteFolder, moveProjects } from '@/lib/studioFolders'
import { listProductExports, downloadArchive } from '@/lib/studioExportArchive'
import { listSends, sendToMarketplace, resendToMarketplace, sendsByExport } from '@/lib/studioMarketplace'
import { MARKETS } from '@/lib/studioMarketplaceRules'
import { marketChips } from '@/lib/studioSentList'
import { studioGate } from '@/lib/studioGate'
import { currentUser } from '@/lib/auth'
import {
  SORTS, FOLDER_ALL, FOLDER_NONE, FOLDER_NAME_MAX, filterProjects, sortProjects, folderCounts, checkFolderName, canDeleteFolder, idsToMove, dateLabel,
} from '@/lib/studioProjectList'
import {
  PRODUCT_TABS, STAGE_LABEL, STAGE_BADGE, NOT_SENT_CHIP, DRAFT_LOCK_NOTE, buildProducts, inTab, tabCounts, rowAction, canPick, pickSummary,
} from '@/lib/studioProductList'

const route = useRoute()
const router = useRouter()

const projects = ref([])
const exportsList = ref([])
const sends = ref([])
const folders = ref([])
const foldersReady = ref(false)
const thumbs = ref(new Map()) // 작업 id → 첫 사진 서명 주소 (결과물 미리보기가 없을 때)
const loading = ref(false)
const errorMsg = ref('')
const sendsError = ref('')
const tab = ref('all')
const folder = ref(FOLDER_ALL)
const query = ref('')
const sort = ref('updated')
const openMenuId = ref(null)
const picked = ref(new Set())
let loadSeq = 0

const titlesKo = ref({}) // 작업 id → 1688 제목 한글 (서버 exports_list titlesKo — 이름 순서는 studioProductList.productName)
const rows = computed(() => buildProducts({ projects: projects.value, exports: exportsList.value, sends: sends.value, titlesKo: titlesKo.value }))
const folderCountsOf = computed(() => folderCounts(projects.value, folders.value))
const currentFolder = computed(() => folders.value.find(f => f.id === folder.value) || null)
// 찾기·폴더를 먼저 거르고(탭 개수는 이 범위) → 탭 → 정렬
const narrowed = computed(() => {
  const keep = new Set(filterProjects(projects.value, { folder: foldersReady.value ? folder.value : FOLDER_ALL, query: query.value }).map(p => p.id))
  return rows.value.filter(r => keep.has(r.id))
})
const counts = computed(() => tabCounts(narrowed.value))
const shown = computed(() => {
  const order = sortProjects(narrowed.value.filter(r => inTab(r, tab.value)).map(r => r.project), sort.value).map(p => p.id)
  const byId = new Map(narrowed.value.map(r => [r.id, r]))
  return order.map(id => byId.get(id))
})
const editorTo = r => ({ name: 'studio-editor', params: { projectId: r.id } })
const thumbOf = r => r.export?.previewUrl || thumbs.value.get(r.id) || null
const chipMap = computed(() => new Map(rows.value.map(r => [r.id, marketChips(r)])))
const chipsOf = r => chipMap.value.get(r.id) || { chips: [], more: null }
const actionOf = r => rowAction(r)

async function load() {
  const seq = ++loadSeq
  loading.value = true
  errorMsg.value = ''
  try {
    const [list, fo, ex] = await Promise.all([listMyProjects(), listFolders(), listProductExports()])
    if (seq !== loadSeq) return
    if (ex.ready !== true) console.error('[StudioProductList] 결과물 표(studio_exports)를 쓸 수 없음 — 모든 상품이 작성 중으로 보임')
    foldersReady.value = fo.ready
    folders.value = fo.folders
    if (folder.value !== FOLDER_ALL && folder.value !== FOLDER_NONE && !fo.folders.some(f => f.id === folder.value)) folder.value = FOLDER_ALL
    projects.value = list
    exportsList.value = Array.isArray(ex.items) ? ex.items : []
    titlesKo.value = ex.titlesKo && typeof ex.titlesKo === 'object' ? ex.titlesKo : {}
    const keep = new Set(rows.value.filter(canPick).map(r => r.id))
    picked.value = new Set([...picked.value].filter(id => keep.has(id)))
    loadSends()
    loadThumbs(list, seq)
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('[StudioProductList] 목록 조회 실패:', e.code, e)
    errorMsg.value = `내 상품을 불러오지 못했습니다: ${e.message || e}`
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}
// 결과물 미리보기가 없는 작업(작성 중 등)만 첫 사진 주소를 받는다 (예전 [내 작업] 썸네일과 같은 규칙 — 표시 순서상 첫 done 사진)
async function loadThumbs(list, seq) {
  const need = list.filter(p => !exportsList.value.some(x => x.projectId === p.id && x.previewUrl))
  if (!need.length) { thumbs.value = new Map(); return }
  try {
    const images = await listImagesOf(need.map(p => p.id))
    const byProject = new Map(need.map(p => [p.id, []]))
    for (const img of images) byProject.get(img.project_id)?.push(img)
    const pathOf = new Map()
    for (const p of need) {
      const first = sortStudioImages(byProject.get(p.id)).find(i => i.ingest_status === 'done' && i.original_path)
      if (first) pathOf.set(p.id, first.original_path)
    }
    const urls = await signViewUrls([...pathOf.values()])
    if (seq !== loadSeq) return
    thumbs.value = new Map([...pathOf].map(([id, path]) => [id, urls.get(path) || null]))
  } catch (e) {
    // 사진만 빈 자리로 보인다 — 목록·상태는 그대로
    if (seq === loadSeq) console.error('[StudioProductList] 썸네일 주소 실패 (빈 자리로 표시):', e)
  }
}
let sendsSeq = 0
async function loadSends() {
  const my = ++sendsSeq
  try {
    const r = await listSends()
    if (my !== sendsSeq) return
    sends.value = Array.isArray(r.sends) ? r.sends : []
    sendsError.value = ''
  } catch (e) {
    if (my !== sendsSeq) return
    console.error('[StudioProductList] 판매처 전송 기록 조회 실패:', e.code, e)
    sendsError.value = `판매처 현황을 불러오지 못했습니다: ${e.message} — 만들기 상태는 보낸 기록 없이 표시됩니다.`
  }
}

// ── 고르기 ──
const pickable = computed(() => shown.value.filter(canPick))
const pickedRows = computed(() => rows.value.filter(r => picked.value.has(r.id)))
const summary = computed(() => pickSummary(pickedRows.value))
const allPicked = computed(() => pickable.value.length > 0 && pickable.value.every(r => picked.value.has(r.id)))
const somePicked = computed(() => pickable.value.some(r => picked.value.has(r.id)))
function togglePick(r) {
  if (!canPick(r)) return
  const next = new Set(picked.value)
  if (next.has(r.id)) next.delete(r.id); else next.add(r.id)
  picked.value = next
}
function pickAll(on) {
  const next = new Set(picked.value)
  for (const r of pickable.value) { if (on) next.add(r.id); else next.delete(r.id) }
  picked.value = next
}
function clearPicks() { picked.value = new Set() }
// 1개 = 예전 보내기 창 그대로 · 2개 이상 = 여러 상품 한 번에 보내기(StudioBulkSendModal) — 한 번에 BULK_MAX개까지
const canSendPicked = computed(() => summary.value.total >= 1 && summary.value.total <= BULK_MAX)
const bulk = reactive({ open: false, rows: [] })
async function sendPicked() {
  const list = pickedRows.value.filter(canPick)
  if (!list.length || list.length > BULK_MAX) return
  if (list.length === 1) { runAction(list[0], { forceSend: true }); return }
  if (!(await studioGate('/studio/projects'))) return // 작업 시작 관문 — 로그인·안내 창은 studioGate가 띄운다
  message.value = ''
  bulk.rows = list
  bulk.open = true
}

// ── 할 일 ──
const opening = ref('')
function gotoSent(id) { router.push({ name: 'studio-channels-sent', query: { focus: String(id) } }) }
function runAction(r, { forceSend = false } = {}) {
  const a = rowAction(r)
  if (a.key === 'edit' && !forceSend) { router.push(editorTo(r)); return }
  if (a.key === 'fix' && !forceSend) { openSendFor(r, { how: a.how, market: a.how === 'send' ? a.send.market : '', sendId: a.send.id }); return }
  openSendFor(r, {})
}

// ── 보내기 창 (상품 하나) ──
const send = reactive({ open: false, prepare: null, error: '', exportId: '', market: '', how: 'send', sendId: null, rowId: '' })
const sentOfOpen = computed(() => {
  if (send.how === 'resend') return []
  const r = rows.value.find(x => x.id === send.rowId)
  return r ? Object.values(r.byMarket) : (send.exportId ? sendsByExport(sends.value)[send.exportId] || [] : [])
})
const message = ref('')
const messageError = ref(false)
let prepareSeq = 0
async function loadPrepare() {
  const my = ++prepareSeq
  send.error = ''
  try {
    const r = send.how === 'resend' ? await resendToMarketplace(send.sendId) : await sendToMarketplace(send.exportId)
    if (my === prepareSeq) send.prepare = r.prepare
  } catch (e) {
    console.error('[StudioProductList] 보내기 준비 실패:', send.exportId, send.sendId, e.code, e)
    if (my === prepareSeq) send.error = e.message
  }
}
async function openSendFor(r, { how = 'send', market = '', sendId = null } = {}) {
  if (!r?.exportId || opening.value) return
  message.value = ''
  opening.value = r.id
  try {
    Object.assign(send, { open: true, prepare: null, error: '', exportId: r.exportId, market, how, sendId, rowId: r.id })
    prepareSeq++
    loadPrepare()
    // 작업 시작 관문 — 막히면 창을 닫는다(로그인·안내 창은 studioGate가 띄운다. 서버 API도 같은 자격을 다시 확인한다)
    if (!(await studioGate(`/studio/projects?send=${encodeURIComponent(r.exportId)}`))) { prepareSeq++; send.open = false }
  } finally {
    opening.value = ''
  }
}
function onSent(r) {
  const market = r?.market || 'coupang'
  const name = MARKETS.find(m => m.key === market)?.name || market
  const no = r?.sellerProductId || r?.originProductNo || r?.productNo || r?.productId || ''
  message.value = `${name}${r?.updated ? '에 있는 상품을 수정했습니다.' : '에 보냈습니다.'}${no ? ` 상품번호 ${no}` : ''}`
  messageError.value = false
  loadSends()
}

// 주소 ?send=<결과물 id> — 목록을 읽은 뒤 그 상품의 보내기 창을 한 번 열고 주소에서 뗀다
watch([() => route.query.send, rows, loading], ([id]) => {
  if (typeof id !== 'string' || !id || loading.value) return
  const r = rows.value.find(x => x.exportId === id || (x.export?.exportIds || []).includes(id))
  if (!r && !rows.value.length) return
  const { send: _s, ...rest } = route.query
  router.replace({ query: rest, hash: route.hash })
  if (!r) { console.warn('[StudioProductList] 주소의 결과물이 목록에 없음 — 창을 열지 않음:', id); return }
  openSendFor(r, {})
})

// ── 이미지 다시 받기 ──
const busy = reactive({})
const busyMessages = computed(() => Object.fromEntries(Object.entries(busy).filter(([, b]) => b.message)))
async function redownload(r) {
  openMenuId.value = null
  busy[r.id] = { running: true, name: r.name, message: '받는 중…', error: false }
  try {
    const n = await downloadArchive(r.exportId, (done, total) => { busy[r.id] = { ...busy[r.id], message: `받는 중 ${done}/${total}` } })
    busy[r.id] = { running: false, name: r.name, message: `${n}장을 받았습니다`, error: false }
  } catch (e) {
    console.error('[StudioProductList] 다시 받기 실패:', r.exportId, e.code, e)
    busy[r.id] = { running: false, name: r.name, message: e.message, error: true }
  }
}

// ── 폴더 ──
const folderModal = reactive({ open: false, folder: null, value: '', saving: false, error: '' })
function openFolderModal(f) { Object.assign(folderModal, { open: true, folder: f, value: f?.name || '', saving: false, error: '' }) }
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
      if (moveModal.open) moveModal.target = made.id
    }
    folderModal.open = false
  } catch (e) {
    console.error('[StudioProductList] 폴더 저장 실패:', e)
    folderModal.error = e.message
  } finally {
    folderModal.saving = false
  }
}
const folderDelete = reactive({ open: false, folder: null, saving: false, error: '' })
function openFolderDelete(f) {
  if (!canDeleteFolder(f.id, folderCountsOf.value)) return
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
    console.error('[StudioProductList] 폴더 삭제 실패:', e)
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
  } catch (e) {
    console.error('[StudioProductList] 폴더로 이동 실패:', e)
    moveModal.error = e.message
  } finally {
    moveModal.saving = false
  }
}

// ── 이름 바꾸기 ──
const renameModal = reactive({ open: false, row: null, value: '', saving: false, error: '' })
function openRename(r) {
  openMenuId.value = null
  Object.assign(renameModal, { open: true, row: r, value: r.project.title || '', saving: false, error: '' })
}
async function saveRename() {
  renameModal.saving = true
  renameModal.error = ''
  try {
    await renameProject(renameModal.row.id, renameModal.value)
    const t = renameModal.value.trim() || null
    projects.value = projects.value.map(p => (p.id === renameModal.row.id ? { ...p, title: t } : p))
    renameModal.open = false
  } catch (e) {
    console.error('[StudioProductList] 이름 바꾸기 실패:', e)
    renameModal.error = e.message
  } finally {
    renameModal.saving = false
  }
}

// ── 삭제 ──
const deleteModal = reactive({ open: false, row: null, saving: false, error: '' })
function openDelete(r) {
  openMenuId.value = null
  Object.assign(deleteModal, { open: true, row: r, saving: false, error: '' })
}
async function confirmDelete() {
  deleteModal.saving = true
  deleteModal.error = ''
  try {
    await softDeleteProject(deleteModal.row.id)
    projects.value = projects.value.filter(p => p.id !== deleteModal.row.id)
    const next = new Set(picked.value); next.delete(deleteModal.row.id); picked.value = next
    deleteModal.open = false
  } catch (e) {
    console.error('[StudioProductList] 삭제 실패:', e)
    deleteModal.error = e.message
  } finally {
    deleteModal.saving = false
  }
}

// ── 복사본 ──
const copyState = reactive({ status: '', projectId: null, error: '' })
async function copyCard(r) {
  openMenuId.value = null
  if (copyState.status === 'working') return
  Object.assign(copyState, { status: 'working', projectId: null, error: '' })
  try {
    const res = await copyProject(r.id)
    Object.assign(copyState, { status: 'done', projectId: res.projectId })
    load()
  } catch (e) {
    console.error('[StudioProductList] 복사본 만들기 실패:', e)
    Object.assign(copyState, { status: 'failed', error: e.message })
  }
}

const closeMenu = () => { openMenuId.value = null }

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 상품·결과물·전송 기록·서명 주소·고른 것을 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    loadSeq++
    sendsSeq++
    prepareSeq++
    projects.value = []
    exportsList.value = []
    sends.value = []
    titlesKo.value = {}
    folders.value = []
    foldersReady.value = false
    thumbs.value = new Map()
    folder.value = FOLDER_ALL
    query.value = ''
    tab.value = 'all'
    picked.value = new Set()
    errorMsg.value = ''
    sendsError.value = ''
    message.value = ''
    Object.assign(send, { open: false, prepare: null, error: '', exportId: '', market: '', how: 'send', sendId: null, rowId: '' })
    Object.assign(bulk, { open: false, rows: [] })
    for (const k of Object.keys(busy)) delete busy[k]
    renameModal.open = false
    deleteModal.open = false
    folderModal.open = false
    folderDelete.open = false
    moveModal.open = false
    Object.assign(copyState, { status: '', projectId: null, error: '' })
  } else {
    load()
  }
}
// 세션 복원 때 이벤트 없이 사용자가 채워지는 경우 (StudioChannelSendView와 같은 이유)
watch(() => currentUser.value?.id, (uid, prev) => { if (uid && prev && uid !== prev) load() })

onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  document.addEventListener('click', closeMenu)
  load()
  loadMarketLinks().catch(e => console.error('[StudioProductList] 판매처 연결 상태 조회 실패:', e)) // 보내기 창의 판매처 줄(스마트스토어·11번가·지그재그 연결 상태 — studioMarketLinks, 예전 보내기 탭과 같게)
})
onUnmounted(() => {
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
  document.removeEventListener('click', closeMenu)
})

defineExpose({ reload: load, rows, picked, pickedRows })
</script>

<style scoped>
.pl-tab { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 9px; font-size: 13px; font-weight: 700; color: var(--st-ink-2); background: var(--st-surface); border: 1px solid var(--st-line-strong); }
.pl-tab:hover { border-color: var(--st-accent); }
.pl-tab.is-active { color: var(--st-surface); background: var(--st-ink); border-color: var(--st-ink); }
.pl-count { font-size: 12px; font-weight: 700; color: var(--st-muted); }
.pl-tab.is-active .pl-count { color: inherit; opacity: 0.8; }
.pl-count.is-alert { color: var(--st-danger); }
.pl-tab.is-active .pl-count.is-alert { color: #fca5a5; opacity: 1; }
.pl-search { display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 10px; width: 220px; max-width: 100%; border-radius: 9px; background: var(--st-surface); border: 1px solid var(--st-line-strong); }
.pl-search:focus-within { border-color: var(--st-accent); box-shadow: 0 0 0 3px var(--st-accent-ring); }
.pl-select { height: 36px; width: auto; padding: 0 10px; font-size: 13px; }
.pl-folder { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 11px; border-radius: 8px; font-size: 13px; font-weight: 700; color: var(--st-ink-2); background: var(--st-surface); border: 1px solid var(--st-line-strong); }
.pl-folder span { font-size: 11px; font-weight: 700; color: var(--st-muted); }
.pl-folder:hover { border-color: var(--st-accent); }
.pl-folder.is-active { color: var(--st-accent); border-color: var(--st-accent); background: var(--st-accent-soft); }
.pl-folder.is-add { border-style: dashed; color: var(--st-muted); }
.pl-table-wrap { overflow: visible; }
.pl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pl-table th { padding: 9px 10px; text-align: left; font-size: 12px; font-weight: 700; color: var(--st-muted); white-space: nowrap; border-bottom: 1px solid var(--st-line); }
.pl-table td { padding: 9px 10px; vertical-align: middle; border-bottom: 1px solid var(--st-line); }
.pl-table tr:last-child td { border-bottom: 0; }
.pl-table tr.is-picked td { background: var(--st-accent-soft); }
.pl-thumb { display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 8px; overflow: hidden; }
.pl-thumb img { width: 100%; height: 100%; object-fit: cover; }
.pl-chip { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; background: var(--st-soft); color: var(--st-ink-2); }
.pl-chip.is-ok { background: #DCFCE7; color: #166534; }
.pl-chip.is-wait { background: #FEF3C7; color: #92400E; }
.pl-chip.is-bad { background: #FEE2E2; color: #991B1B; }
.pl-chip.is-gone { background: var(--st-soft); color: var(--st-muted); }
.pl-chip.is-more { cursor: help; }
.pl-act { height: 32px; padding: 0 12px; font-size: 13px; white-space: nowrap; }
.pl-menu { display: block; width: 100%; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 600; color: var(--st-ink-2); }
.pl-menu:hover:not(:disabled) { background: var(--st-soft); }
.pl-menu.st-danger-text { color: var(--st-danger); }
.pl-move { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 10px 14px; font-size: 14px; font-weight: 600; color: var(--st-ink-2); background: var(--st-surface); }
.pl-move:hover { background: var(--st-soft); }
.pl-move.is-active { color: var(--st-accent); background: var(--st-accent-soft); }
.pl-bar { position: sticky; bottom: 12px; z-index: 30; margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px 14px; }
/* 폰 — 카드 목록 · 누르는 것 44px 이상 */
.pl-cards { display: none; }
.pl-card { padding: 12px; }
.pl-card + .pl-card { margin-top: 10px; }
.pl-card.is-picked { box-shadow: 0 0 0 2px var(--st-accent); }
.pl-card-check { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; margin: -6px -6px 0 -6px; flex-shrink: 0; }
@media (max-width: 767px) {
  .pl-table-wrap { display: none; }
  .pl-cards { display: block; }
  .pl-tap { min-height: 44px; min-width: 44px; }
  .pl-tab { height: 44px; }
  .pl-search { width: 100%; height: 44px; }
  .pl-select { height: 44px; }
}
</style>
