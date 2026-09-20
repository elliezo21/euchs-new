<template>
  <div class="max-w-5xl mx-auto space-y-6 select-none pb-20">

    <!-- 상단 페이지 헤더 & 안내 배너 -->
    <div class="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-base">
            📢
          </div>
          <h2 class="text-lg sm:text-xl font-black text-slate-900">공지사항 & 일정 등록 관리</h2>
        </div>
        <p class="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          메인페이지 공지 피드 및 커뮤니티 공지사항 게시판에 노출되는 글을 작성하고 관리합니다.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-center">
        <button
          type="button"
          @click="scrollToForm"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
        >
          <span>+ 새 공지사항 작성</span>
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 1. [공지사항 작성 / 수정] 카드 폼 (스마트스토어 센터 화이트 테마) -->
    <!-- ======================================================== -->
    <div ref="formRef" class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full" :class="editingId ? 'bg-amber-500' : 'bg-blue-600'"></span>
          <h3 class="font-black text-slate-900 text-sm">
            {{ editingId ? '✏️ 공지사항 수정하기' : '📝 신규 공지사항 등록' }}
          </h3>
        </div>
        <span class="text-xs text-slate-400 font-medium">
          {{ editingId ? '기존 공지 내용을 수정 중입니다.' : '필수 항목을 입력 후 등록하기 버튼을 눌러주세요.' }}
        </span>
      </div>

      <form @submit.prevent="confirmSaveNotice = true" class="p-6 space-y-4">
        <!-- 1열: 카테고리 + 뱃지 라벨 + 상단 고정 핀 (3단 그리드) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <!-- 1) 분류 카테고리 -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700">분류 카테고리</label>
            <select
              v-model="noticeForm.category"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-xs bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option v-for="cat in NOTICE_CATEGORIES" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>

          <!-- 2) 뱃지 라벨 -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700">뱃지 라벨</label>
            <input
              type="text"
              v-model="noticeForm.badge"
              placeholder="예: 공지, 긴급, 필독, 마감, 투어"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-xs bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- 3) 최상단 중요 공지 고정 (Pin) -->
          <div class="pt-5 sm:pt-6">
            <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 cursor-pointer transition">
              <input
                type="checkbox"
                v-model="noticeForm.is_pinned"
                id="is_pinned"
                class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span class="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>📌 최상단 중요 공지 고정 (Pin)</span>
              </span>
            </label>
          </div>
        </div>

        <!-- 2열: 공지 제목 -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">공지 제목</label>
          <input
            type="text"
            v-model="noticeForm.title"
            required
            placeholder="제목을 입력하세요"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- 3열: 요약 설명 (메인 피드 노출) -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">요약 설명 (메인 피드 노출 1줄 요약)</label>
          <input
            type="text"
            v-model="noticeForm.summary"
            placeholder="간단한 1줄 요약문"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- 4열: 썸네일 이미지 URL & 업로드 버튼 -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">썸네일 이미지</label>
          <div class="flex gap-2">
            <input
              type="text"
              v-model="noticeForm.thumbnail_url"
              placeholder="https://... 또는 우측 이미지 업로드 버튼 클릭"
              class="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <!-- 숨김 파일 인풋 -->
            <input
              type="file"
              ref="noticeFileInput"
              accept="image/*"
              class="hidden"
              @change="handleNoticeImageUpload"
            />
            <button
              type="button"
              @click="triggerNoticeImageUpload"
              class="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs border border-blue-200 hover:border-blue-600 transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-xs"
            >
              <span>📤 이미지 업로드</span>
            </button>
          </div>
        </div>

        <!-- 5열: 상세 내용 (줄바꿈 지원) -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700">상세 내용 (줄바꿈 지원)</label>
          <textarea
            v-model="noticeForm.content"
            rows="6"
            required
            placeholder="상세 공지 내용을 입력하세요"
            class="w-full p-3.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
          ></textarea>
        </div>

        <!-- 하단 액션 버튼 바 -->
        <div class="flex items-center justify-between pt-2">
          <div class="text-xs text-slate-400 font-medium">
            * 등록된 공지는 메인 상단 피드 및 커뮤니티 공지사항에 즉시 반영됩니다.
          </div>

          <div class="flex items-center gap-2.5">
            <button
              v-if="editingId"
              type="button"
              @click="cancelEdit"
              class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              작성 취소
            </button>

            <button
              type="submit"
              :disabled="isSaving || isUploadingImage"
              class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{{ editingId ? '✓ 공지 수정 완료' : '✓ 공지 등록하기' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- ======================================================== -->
    <!-- 2. [등록된 공지사항 목록 관리] 테이블 (화이트 테마) -->
    <!-- ======================================================== -->
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
          <h3 class="font-black text-slate-900 text-sm">등록된 공지사항 목록</h3>
          <span class="text-xs font-mono text-slate-400">({{ filteredNotices.length }}건)</span>
        </div>

        <!-- 필터 & 검색 인풋 -->
        <div class="flex items-center gap-2 flex-wrap">
          <select
            v-model="filterCategory"
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 outline-none font-medium cursor-pointer"
          >
            <option value="all">전체 카테고리</option>
            <option v-for="cat in NOTICE_CATEGORIES" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>

          <input
            type="text"
            v-model="searchQuery"
            placeholder="공지 제목 검색..."
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 outline-none w-44"
          />
        </div>
      </div>

      <!-- 공지 목록 테이블 -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700">
          <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
            <tr>
              <th class="py-3 px-4 w-12 text-center">No</th>
              <th class="py-3 px-3 w-16 text-center">고정</th>
              <th class="py-3 px-4 w-28">분류</th>
              <th class="py-3 px-4 min-w-[280px]">공지 제목 및 요약</th>
              <th class="py-3 px-4 w-28 text-center">등록일시</th>
              <th class="py-3 px-4 w-24 text-center">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="(item, idx) in filteredNotices"
              :key="item.id || idx"
              class="hover:bg-slate-50/80 transition"
              :class="item.is_pinned ? 'bg-amber-50/30' : ''"
            >
              <!-- No -->
              <td class="py-3.5 px-4 text-center font-mono text-slate-400">
                {{ idx + 1 }}
              </td>

              <!-- 고정 핀 -->
              <td class="py-3.5 px-3 text-center">
                <span
                  v-if="item.is_pinned"
                  class="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200 inline-block"
                  title="최상단 고정 공지"
                >
                  📌 Pin
                </span>
                <span v-else class="text-slate-300 font-mono">-</span>
              </td>

              <!-- 분류 카테고리 -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="getCategoryBadgeStyle(item.category)">
                    {{ getCategoryLabel(item.category) }}
                  </span>
                  <span v-if="item.badge" class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {{ item.badge }}
                  </span>
                </div>
              </td>

              <!-- 제목 및 요약문 -->
              <td class="py-3.5 px-4">
                <div class="space-y-0.5">
                  <div class="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <span>{{ item.title }}</span>
                    <span v-if="item.thumbnail_url" class="text-[10px] text-blue-500 font-normal">🖼️ 사진첨부</span>
                  </div>
                  <p v-if="item.summary" class="text-[11px] text-slate-400 truncate max-w-md">
                    {{ item.summary }}
                  </p>
                </div>
              </td>

              <!-- 등록일시 -->
              <td class="py-3.5 px-4 text-center font-mono text-[11px] text-slate-500">
                {{ formatDate(item.created_at || item.createdAt) }}
              </td>

              <!-- 관리 액션 -->
              <td class="py-3.5 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    @click="startEdit(item)"
                    class="px-2 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-bold text-[11px] text-slate-600 transition cursor-pointer"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    @click="deleteNotice(item.id)"
                    class="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] transition cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>

            <!-- 빈 목록일 때 -->
            <tr v-if="filteredNotices.length === 0">
              <td colspan="6" class="py-12 text-center text-slate-400 space-y-2">
                <div class="text-3xl">📢</div>
                <p class="font-bold text-xs text-slate-600">등록된 공지사항이 없습니다.</p>
                <p class="text-[11px] text-slate-400">상단 폼에서 신규 공지를 등록해 보세요.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 토스트 알림창 -->
    <Transition name="toast">
      <div
        v-if="toast.show"
        class="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2.5 bg-emerald-600 text-white"
      >
        <span>✅</span>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

    <!-- ConfirmSaveModal: 공지 삭제 -->
    <ConfirmSaveModal
      v-model="confirmDeleteNotice"
      title="해당 공지사항을 정말 삭제할까요?"
      description="삭제 후에는 복구할 수 없습니다."
      variant="red"
      icon="warn"
      confirmText="삭제"
      @confirm="executeDeleteNotice"
    />

    <!-- ConfirmSaveModal: 공지 게시/수정 -->
    <ConfirmSaveModal
      v-model="confirmSaveNotice"
      :title="editingId ? '수정 내용을 저장할까요?' : '공지사항을 게시할까요?'"
      variant="blue"
      :confirmText="editingId ? '저장' : '게시'"
      @confirm="handleSubmitNotice"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import ConfirmSaveModal from '@/components/common/ConfirmSaveModal.vue'
import { NOTICE_CATEGORIES } from '@/utils/noticeCategories'

// 다른 화면(HomeView/MallView/AdminDashboardView 등)이 읽는 캐시 키 — DB 조회 결과를 동기화용으로만 기록
const NOTICES_STORAGE_KEY = 'euchs_admin_notices'

const formRef = ref(null)
const noticeFileInput = ref(null)
const editingId = ref(null)
const confirmSaveNotice = ref(false)
const confirmDeleteNotice = ref(false)
const pendingDeleteNoticeId = ref(null)
const filterCategory = ref('all')
const searchQuery = ref('')
const isSaving = ref(false)
const isUploadingImage = ref(false)

const noticesList = ref([])

const noticeForm = ref({
  category: 'schedule',
  badge: '공지',
  is_pinned: false,
  title: '',
  summary: '',
  thumbnail_url: '',
  content: ''
})

const toast = ref({ show: false, message: '' })
let toastTimer = null

function showToast(msg) {
  clearTimeout(toastTimer)
  toast.value = { show: true, message: msg }
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

const filteredNotices = computed(() => {
  let list = [...noticesList.value]

  if (filterCategory.value !== 'all') {
    list = list.filter(n => n.category === filterCategory.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.summary || '').toLowerCase().includes(q)
    )
  }

  // 1순위: Pinned(고정) 우선, 2순위: 최신순 정렬
  return list.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  })
})

function getCategoryLabel(cat) {
  return NOTICE_CATEGORIES.find(c => c.id === cat)?.name || '공지'
}

function getCategoryBadgeStyle(cat) {
  const map = {
    schedule: 'bg-amber-50 text-amber-700 border border-amber-200',
    event: 'bg-rose-50 text-rose-700 border border-rose-200',
    logistics: 'bg-teal-50 text-teal-700 border border-teal-200',
    customs: 'bg-purple-50 text-purple-700 border border-purple-200',
    system: 'bg-blue-50 text-blue-700 border border-blue-200',
    general: 'bg-slate-100 text-slate-700 border border-slate-200'
  }
  return map[cat] || 'bg-slate-100 text-slate-700 border border-slate-200'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

function scrollToForm() {
  if (formRef.value) {
    formRef.value.scrollIntoView({ behavior: 'smooth' })
  }
}

function triggerNoticeImageUpload() {
  if (noticeFileInput.value) {
    noticeFileInput.value.click()
  }
}

// 썸네일을 Supabase Storage(notices 버킷)에 업로드하고 공개 URL을 폼에 반영
// (blob: 임시 URL은 다른 브라우저에서 깨지므로 DB에 저장하면 안 됨)
async function handleNoticeImageUpload(e) {
  const input = e.target
  const file = input?.files?.[0]
  if (!file) return

  if (!isSupabaseConfigured()) {
    alert('Supabase 연동이 필요합니다.')
    input.value = ''
    return
  }

  isUploadingImage.value = true
  try {
    const fileExt = file.name.split('.').pop()
    const filePath = `notice_thumbnails/notice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('notices')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      console.error('Notice image upload error:', uploadError)
      alert('이미지 업로드 실패: ' + uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('notices').getPublicUrl(filePath)
    noticeForm.value.thumbnail_url = publicUrlData.publicUrl
    showToast('이미지가 업로드되었습니다.')
  } catch (err) {
    console.error('Notice image upload exception:', err)
    alert('이미지 업로드 중 오류가 발생했습니다: ' + (err.message || err))
  } finally {
    isUploadingImage.value = false
    input.value = ''
  }
}

// DB(notices 테이블)에서 공지 목록 조회 — 성공 여부 반환
async function fetchNotices() {
  if (!isSupabaseConfigured()) {
    alert('Supabase 연동이 필요합니다.')
    return false
  }

  try {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .neq('category', 'system_config')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch notices error:', error)
      alert('공지사항 목록을 불러오지 못했습니다: ' + error.message)
      return false
    }

    noticesList.value = data || []
    return true
  } catch (err) {
    console.error('Fetch notices exception:', err)
    alert('공지사항 목록을 불러오는 중 오류가 발생했습니다: ' + (err.message || err))
    return false
  }
}

// 다른 화면(같은 브라우저)에 공지 변경 알림 — 기존 euchs-notice-update 이벤트 발행 로직 유지
function publishNoticeUpdate() {
  localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(noticesList.value))
  localStorage.setItem('euchs_notices', JSON.stringify(noticesList.value))
  window.dispatchEvent(new CustomEvent('euchs-notice-update', { detail: noticesList.value }))
  window.dispatchEvent(new Event('storage'))
}

// 저장/삭제 성공 후: DB에서 다시 불러와 목록 갱신 + 변경 알림
async function refetchAndPublish() {
  const ok = await fetchNotices()
  if (ok) publishNoticeUpdate()
}

async function handleSubmitNotice() {
  if (isSaving.value) return

  if (!noticeForm.value.title.trim()) {
    alert('공지 제목을 입력해 주세요.')
    return
  }

  if (!isSupabaseConfigured()) {
    alert('Supabase 연동이 필요합니다.')
    return
  }

  // id/created_at/updated_at 은 보내지 않음 (id·created_at은 DB 기본값, updated_at 컬럼은 테이블에 없음)
  const form = noticeForm.value
  const payload = {
    title: form.title.trim(),
    category: form.category,
    category_name: getCategoryLabel(form.category),
    badge: (form.badge || '').trim() || '공지',
    is_pinned: Boolean(form.is_pinned),
    is_important: Boolean(form.is_pinned),
    summary: form.summary || '',
    content: form.content || '',
    thumbnail_url: form.thumbnail_url || '',
    image: form.thumbnail_url || ''
  }

  isSaving.value = true
  try {
    if (editingId.value !== null) {
      // 수정 모드
      const { data, error } = await supabase
        .from('notices')
        .update(payload)
        .eq('id', editingId.value)
        .select()

      if (error) {
        console.error('Supabase notice update error:', error)
        alert('공지사항 수정 실패: ' + error.message)
        return
      }
      if (!data || data.length === 0) {
        console.error('Supabase notice update affected 0 rows. id =', editingId.value)
        alert('공지사항 수정 실패: 수정할 공지를 찾지 못했습니다.')
        return
      }
      showToast('공지사항이 성공적으로 수정되었습니다.')
    } else {
      // 신규 등록 모드
      const { error } = await supabase
        .from('notices')
        .insert([payload])

      if (error) {
        console.error('Supabase notice insert error:', error)
        alert('공지사항 등록 실패: ' + error.message)
        return
      }
      showToast('신규 공지사항이 성공적으로 등록되었습니다.')
    }

    resetNoticeForm()
    await refetchAndPublish()
  } catch (err) {
    console.error('Notice save exception:', err)
    alert('공지 저장 중 오류가 발생했습니다: ' + (err.message || err))
  } finally {
    isSaving.value = false
  }
}

function startEdit(item) {
  editingId.value = item.id
  noticeForm.value = {
    category: item.category || 'general',
    badge: item.badge || '',
    is_pinned: Boolean(item.is_pinned),
    title: item.title || '',
    summary: item.summary || '',
    thumbnail_url: item.thumbnail_url || item.image || '',
    content: item.content || ''
  }
  scrollToForm()
}

function cancelEdit() {
  resetNoticeForm()
}

function resetNoticeForm() {
  editingId.value = null
  noticeForm.value = {
    category: 'schedule',
    badge: '공지',
    is_pinned: false,
    title: '',
    summary: '',
    thumbnail_url: '',
    content: ''
  }
}

function deleteNotice(id) {
  pendingDeleteNoticeId.value = id
  confirmDeleteNotice.value = true
}

async function executeDeleteNotice() {
  const id = pendingDeleteNoticeId.value
  if (id === null || id === undefined) return

  if (!isSupabaseConfigured()) {
    alert('Supabase 연동이 필요합니다.')
    return
  }

  try {
    const { data, error } = await supabase
      .from('notices')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('Supabase notice delete error:', error)
      alert('공지사항 삭제 실패: ' + error.message)
      return
    }
    if (!data || data.length === 0) {
      console.error('Supabase notice delete affected 0 rows. id =', id)
      alert('공지사항 삭제 실패: 삭제할 공지를 찾지 못했습니다.')
      return
    }

    showToast('공지사항이 삭제되었습니다.')
    if (editingId.value === id) {
      resetNoticeForm()
    }
    pendingDeleteNoticeId.value = null
    await refetchAndPublish()
  } catch (err) {
    console.error('Notice delete exception:', err)
    alert('공지 삭제 중 오류가 발생했습니다: ' + (err.message || err))
  }
}

onMounted(() => {
  fetchNotices()
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
