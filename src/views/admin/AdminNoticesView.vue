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

      <form @submit.prevent="handleSubmitNotice" class="p-6 space-y-4">
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
              <option value="schedule">업무일정 (연휴/마감)</option>
              <option value="event">이벤트 & 프로모션</option>
              <option value="system">시스템 & 서버안내</option>
              <option value="customs">세관 & 통관소식</option>
              <option value="general">일반 공지사항</option>
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
              class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-1.5 active:scale-95"
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
            <option value="schedule">업무일정</option>
            <option value="event">이벤트</option>
            <option value="system">시스템안내</option>
            <option value="customs">세관통관</option>
            <option value="general">일반공지</option>
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

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const NOTICES_STORAGE_KEY = 'euchs_notices'

const formRef = ref(null)
const noticeFileInput = ref(null)
const editingId = ref(null)
const filterCategory = ref('all')
const searchQuery = ref('')

const DEFAULT_NOTICES = [
  {
    id: 'notice-1',
    category: 'system',
    badge: '시스템',
    is_pinned: true,
    title: '8/29(토) EUCHS 클라우드 DB 및 1688 API 연동망 정기 점검 안내',
    summary: '8월 29일(토) 새벽 02:00 ~ 06:00 정기 점검에 따른 일부 기능 일시 제한 안내',
    thumbnail_url: '',
    content: '안녕하세요. 이유씨컴퍼니(EUCHS) 운영팀입니다.\n\n안정적인 1688 수입대행 ERP 서비스 제공을 위해 하반기 정기 서버 점검이 진행됩니다.\n\n- 일시: 2026.08.29(토) 02:00 ~ 06:00 (약 4시간)\n- 작업 내용: 1688 자동 소싱 연동망 및 관세청 유니패스 연계 점검\n\n점검 중에도 고객 주문 접수는 정상 유지됩니다.',
    created_at: '2026-08-25T10:00:00.000Z'
  },
  {
    id: 'notice-2',
    category: 'schedule',
    badge: '투어',
    is_pinned: true,
    title: '2026년 9월 43기 중국 이우(푸텐) 도매시장 바이어 조사단 모집 안내',
    summary: '중국 이우 1~5기 도매시장 전담 통역 동행 투어 선착순 12명 모집',
    thumbnail_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    content: '중국 이우 푸텐시장 1~5구 전 구역을 전담 매니저와 함께 동행하는 43기 이우 시장조사 투어 접수가 시작되었습니다.\n\n- 일정: 2026년 9월 16일 ~ 9월 20일 (4박 5일)\n- 모집 인원: 선착순 12명 (잔여 5석)\n- 혜택: 전담 통역, 픽업, 호텔, 공장 섭외 풀패키지 지원',
    created_at: '2026-08-23T14:30:00.000Z'
  },
  {
    id: 'notice-3',
    category: 'customs',
    badge: '통관',
    is_pinned: false,
    title: '한-중 FTA 원산지증명서(C/O) 발급 및 관세 감면 실무 가이드',
    summary: '정식 수입신고 시 FTA 협정관세 0~4% 감면 적용 절차 안내',
    thumbnail_url: '',
    content: '중국 수입 시 한-중 FTA 협정관세를 적용받기 위한 원산지증명서(C/O) 발급 절차 및 서류 안내입니다.\n\n당사 창고에서 출고 전 발급 대행을 원스톱으로 지원해 드립니다.',
    created_at: '2026-08-20T09:15:00.000Z'
  }
]

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
  const map = {
    schedule: '업무일정',
    event: '이벤트',
    system: '시스템안내',
    customs: '세관통관',
    general: '일반공지'
  }
  return map[cat] || '공지'
}

function getCategoryBadgeStyle(cat) {
  const map = {
    schedule: 'bg-amber-50 text-amber-700 border border-amber-200',
    event: 'bg-rose-50 text-rose-700 border border-rose-200',
    system: 'bg-blue-50 text-blue-700 border border-blue-200',
    customs: 'bg-purple-50 text-purple-700 border border-purple-200',
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

function handleNoticeImageUpload(e) {
  const file = e.target?.files?.[0]
  if (!file) return

  const fileUrl = URL.createObjectURL(file)
  noticeForm.value.thumbnail_url = fileUrl
  showToast('이미지가 선택되었습니다.')
  e.target.value = ''
}

function loadNotices() {
  try {
    const raw = localStorage.getItem(NOTICES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        noticesList.value = parsed
        return
      }
    }
  } catch (e) {
    console.warn('Failed to load notices:', e)
  }
  noticesList.value = JSON.parse(JSON.stringify(DEFAULT_NOTICES))
  saveToStorage()
}

function saveToStorage() {
  localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(noticesList.value))
  window.dispatchEvent(new CustomEvent('euchs-notice-update', { detail: noticesList.value }))
  window.dispatchEvent(new Event('storage'))
}

function handleSubmitNotice() {
  if (!noticeForm.value.title.trim()) {
    alert('공지 제목을 입력해 주세요.')
    return
  }

  if (editingId.value) {
    // 수정 모드
    const target = noticesList.value.find(n => n.id === editingId.value)
    if (target) {
      target.category = noticeForm.value.category
      target.badge = noticeForm.value.badge
      target.is_pinned = noticeForm.value.is_pinned
      target.title = noticeForm.value.title
      target.summary = noticeForm.value.summary
      target.thumbnail_url = noticeForm.value.thumbnail_url
      target.content = noticeForm.value.content
      target.updated_at = new Date().toISOString()
    }
    showToast('공지사항이 성공적으로 수정되었습니다.')
  } else {
    // 신규 등록 모드
    const newNotice = {
      id: `notice-${Date.now()}`,
      category: noticeForm.value.category,
      badge: noticeForm.value.badge || '공지',
      is_pinned: Boolean(noticeForm.value.is_pinned),
      title: noticeForm.value.title,
      summary: noticeForm.value.summary,
      thumbnail_url: noticeForm.value.thumbnail_url,
      content: noticeForm.value.content,
      created_at: new Date().toISOString()
    }
    noticesList.value.unshift(newNotice)
    showToast('신규 공지사항이 성공적으로 등록되었습니다.')
  }

  saveToStorage()
  resetNoticeForm()
}

function startEdit(item) {
  editingId.value = item.id
  noticeForm.value = {
    category: item.category || 'general',
    badge: item.badge || '',
    is_pinned: Boolean(item.is_pinned),
    title: item.title || '',
    summary: item.summary || '',
    thumbnail_url: item.thumbnail_url || '',
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
  if (confirm('해당 공지사항을 정말 삭제하시겠습니까?')) {
    noticesList.value = noticesList.value.filter(n => n.id !== id)
    saveToStorage()
    showToast('공지사항이 삭제되었습니다.')
    if (editingId.value === id) {
      resetNoticeForm()
    }
  }
}

onMounted(() => {
  loadNotices()
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
