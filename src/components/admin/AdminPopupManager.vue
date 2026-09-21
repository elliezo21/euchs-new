<template>
  <!-- 긴급공지 팝업 관리 (popups 테이블 CRUD / 9:16 영상 위젯과 완전 별개) -->
  <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
    <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
        <h3 class="font-black text-slate-900 text-base">4. 긴급공지 팝업 관리</h3>
      </div>
      <button
        type="button"
        @click="openAdd"
        class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition cursor-pointer active:scale-95 shadow-xs"
      >
        + 팝업 추가
      </button>
    </div>

    <div class="p-6 space-y-3">
      <p v-if="listError" class="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{{ listError }}</p>
      <p v-if="isLoading" class="text-sm text-slate-400">불러오는 중...</p>
      <p v-else-if="popups.length === 0 && !listError" class="text-sm text-slate-400 py-6 text-center">
        등록된 긴급공지 팝업이 없습니다.
      </p>

      <div
        v-for="p in popups"
        :key="p.id"
        class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/40"
      >
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-base text-slate-900 truncate">{{ p.title }}</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold" :class="statusOf(p).cls">{{ statusOf(p).label }}</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
              {{ p.media_type === 'video_youtube' ? '유튜브 ' + p.video_aspect_ratio : '이미지' + (p.is_rolling ? ' 롤링' : '') }}
            </span>
          </div>
          <div class="text-xs text-slate-500 font-mono">
            {{ fmtDate(p.start_date) }} ~ {{ fmtDate(p.end_date) }} · {{ p.position_preset }} · 순서 {{ p.display_order }}
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            @click="toggleActive(p)"
            class="px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer"
            :class="p.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'"
          >
            {{ p.is_active ? '활성' : '비활성' }}
          </button>
          <button type="button" @click="openEdit(p)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer">수정</button>
          <button type="button" @click="askDelete(p)" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition cursor-pointer">삭제</button>
        </div>
      </div>
    </div>

    <!-- 추가/수정 모달 -->
    <Teleport to="body">
      <div v-if="isModalOpen" class="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/60" @click.self="closeModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <h4 class="font-black text-slate-900 text-base">{{ editingId ? '긴급공지 팝업 수정' : '긴급공지 팝업 추가' }}</h4>
            <button type="button" @click="closeModal" class="text-slate-400 hover:text-slate-700 text-lg cursor-pointer">✕</button>
          </div>

          <div class="p-6 space-y-5 text-sm">
            <!-- 제목 -->
            <div class="space-y-1.5">
              <label class="font-bold text-slate-800">관리용 제목 *</label>
              <input v-model="form.title" type="text" placeholder="예: 추석 연휴 배송 안내" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            <!-- 미디어 타입 -->
            <div class="space-y-1.5">
              <label class="font-bold text-slate-800">미디어 종류</label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="opt in mediaTypeOptions"
                  :key="opt.value"
                  class="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition"
                  :class="form.media_type === opt.value ? 'border-amber-500 bg-amber-50/50 font-black' : 'border-slate-200 hover:border-slate-300'"
                >
                  <input type="radio" v-model="form.media_type" :value="opt.value" class="w-4 h-4 cursor-pointer" />
                  <span>{{ opt.label }}</span>
                </label>
              </div>
            </div>

            <!-- 이미지 설정 -->
            <div v-if="form.media_type === 'image'" class="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label class="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input type="checkbox" v-model="form.is_rolling" class="w-4 h-4 cursor-pointer" />
                여러 장 자동 롤링
              </label>
              <div v-if="form.is_rolling" class="flex items-center gap-2">
                <span class="text-slate-600">전환 간격</span>
                <input v-model.number="rollingSeconds" type="number" min="1" step="1" class="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500" />
                <span class="text-slate-600">초</span>
              </div>

              <div v-for="(s, i) in form.slides" :key="i" class="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                <img :src="s.url" class="w-14 h-14 object-cover rounded-md border border-slate-200 shrink-0" alt="" />
                <input v-model="s.link" type="text" placeholder="클릭 시 이동 링크 (선택, https://... 또는 /경로)" class="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono outline-none focus:ring-2 focus:ring-amber-500" />
                <button type="button" @click="form.slides.splice(i, 1)" class="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 font-bold cursor-pointer">삭제</button>
              </div>

              <div v-if="form.is_rolling || form.slides.length === 0">
                <input ref="slideFileInput" type="file" accept="image/*" class="hidden" @change="handleSlideUpload" />
                <button
                  type="button"
                  :disabled="isUploading"
                  @click="slideFileInput && slideFileInput.click()"
                  class="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white font-bold border border-amber-200 hover:border-amber-500 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isUploading ? '업로드 중...' : '📤 이미지 업로드' }}
                </button>
              </div>
            </div>

            <!-- 유튜브 설정 -->
            <div v-else class="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div class="space-y-1.5">
                <label class="font-bold text-slate-800">유튜브 링크</label>
                <input v-model="form.youtube_url" type="text" placeholder="https://www.youtube.com/watch?v=..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div class="space-y-1.5">
                <label class="font-bold text-slate-800">영상 비율</label>
                <select v-model="form.video_aspect_ratio" class="px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="9:16">9:16 (세로)</option>
                  <option value="16:9">16:9 (가로)</option>
                </select>
              </div>
            </div>

            <!-- 크기/위치 -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="space-y-1.5">
                <label class="font-bold text-slate-800">가로(px)</label>
                <input v-model.number="form.width_px" type="number" min="100" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div v-if="form.media_type === 'image'" class="space-y-1.5">
                <label class="font-bold text-slate-800">세로(px)</label>
                <input v-model.number="form.height_px" type="number" min="100" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div class="space-y-1.5" :class="form.media_type === 'image' ? '' : 'sm:col-span-1'">
                <label class="font-bold text-slate-800">위치</label>
                <select v-model="form.position_preset" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500">
                  <option v-for="pp in positionOptions" :key="pp.value" :value="pp.value">{{ pp.label }}</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="font-bold text-slate-800">X 보정(px)</label>
                <input v-model.number="form.offset_x" type="number" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div class="space-y-1.5">
                <label class="font-bold text-slate-800">Y 보정(px)</label>
                <input v-model.number="form.offset_y" type="number" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
            <p class="text-xs text-slate-500 -mt-2">보정값: +X는 오른쪽, +Y는 아래쪽으로 이동합니다.</p>

            <!-- 기간/노출 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="font-bold text-slate-800">노출 시작 *</label>
                <input v-model="form.start_local" type="datetime-local" class="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div class="space-y-1.5">
                <label class="font-bold text-slate-800">노출 종료 *</label>
                <input v-model="form.end_local" type="datetime-local" class="w-full px-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input type="checkbox" v-model="form.is_active" class="w-4 h-4 cursor-pointer" />
                활성화
              </label>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-800">표시 순서</span>
                <input v-model.number="form.display_order" type="number" class="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>

            <p v-if="formError" class="font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{{ formError }}</p>
          </div>

          <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white">
            <button type="button" @click="closeModal" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer">취소</button>
            <button
              type="button"
              :disabled="isSaving || isUploading"
              @click="save"
              class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSaving ? '저장 중...' : '저장' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmSaveModal
      v-model="confirmDelete"
      :title="`'${pendingDelete?.title || ''}' 팝업을 삭제할까요?`"
      description="삭제하면 되돌릴 수 없습니다."
      variant="red"
      icon="warn"
      confirmText="삭제"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import ConfirmSaveModal from '@/components/common/ConfirmSaveModal.vue'

// popups CHECK 제약과 동일한 값만 사용 (DB에서 확인)
const mediaTypeOptions = [
  { value: 'image', label: '이미지 (단일/롤링)' },
  { value: 'video_youtube', label: '유튜브 영상' }
]
const positionOptions = [
  { value: 'center', label: '정중앙' },
  { value: 'top-left', label: '좌상단' },
  { value: 'top-center', label: '상단 중앙' },
  { value: 'top-right', label: '우상단' },
  { value: 'bottom-left', label: '좌하단' },
  { value: 'bottom-center', label: '하단 중앙' },
  { value: 'bottom-right', label: '우하단' }
]

const popups = ref([])
const isLoading = ref(false)
const listError = ref('')

const isModalOpen = ref(false)
const editingId = ref(null)
const form = ref(null)
const rollingSeconds = ref(4)
const formError = ref('')
const isSaving = ref(false)
const isUploading = ref(false)
const slideFileInput = ref(null)

const confirmDelete = ref(false)
const pendingDelete = ref(null)

// Date(ISO) <-> <input type="datetime-local"> (브라우저 로컬 시간)
const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (iso) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '-')

const statusOf = (p) => {
  const now = Date.now()
  if (!p.is_active) return { label: '비활성', cls: 'bg-slate-200 text-slate-600' }
  if (now < new Date(p.start_date).getTime()) return { label: '예정', cls: 'bg-blue-100 text-blue-700' }
  if (now > new Date(p.end_date).getTime()) return { label: '종료', cls: 'bg-slate-200 text-slate-500' }
  return { label: '게시중', cls: 'bg-emerald-100 text-emerald-700' }
}

const emptyForm = () => {
  const start = new Date()
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  return {
    title: '',
    media_type: 'image',
    is_rolling: false,
    slides: [],
    youtube_url: '',
    video_aspect_ratio: '9:16',
    width_px: 400,
    height_px: 500,
    position_preset: 'center',
    offset_x: 0,
    offset_y: 0,
    start_local: toLocalInput(start.toISOString()),
    end_local: toLocalInput(end.toISOString()),
    is_active: true,
    display_order: 0
  }
}

async function loadPopups() {
  listError.value = ''
  if (!isSupabaseConfigured()) {
    listError.value = 'Supabase 설정이 필요합니다.'
    return
  }
  isLoading.value = true
  const { data, error } = await supabase
    .from('popups')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
  isLoading.value = false
  if (error) {
    console.error('[PopupAdmin] popups 조회 실패:', error)
    listError.value = '목록 조회 실패: ' + error.message
    return
  }
  popups.value = data || []
}

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  rollingSeconds.value = 4
  formError.value = ''
  isModalOpen.value = true
}

function openEdit(p) {
  editingId.value = p.id
  form.value = {
    title: p.title,
    media_type: p.media_type,
    is_rolling: p.is_rolling,
    slides: Array.isArray(p.slides) ? p.slides.map((s) => ({ url: s.url, link: s.link || '' })) : [],
    youtube_url: p.youtube_url || '',
    video_aspect_ratio: p.video_aspect_ratio,
    width_px: p.width_px,
    height_px: p.height_px,
    position_preset: p.position_preset,
    offset_x: p.offset_x,
    offset_y: p.offset_y,
    start_local: toLocalInput(p.start_date),
    end_local: toLocalInput(p.end_date),
    is_active: p.is_active,
    display_order: p.display_order
  }
  rollingSeconds.value = Math.max(1, Math.round((p.rolling_interval_ms || 4000) / 1000))
  formError.value = ''
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  editingId.value = null
  formError.value = ''
}

async function handleSlideUpload(e) {
  const file = e.target?.files?.[0]
  if (!file) return
  formError.value = ''
  if (!file.type.startsWith('image/')) {
    formError.value = '이미지 파일만 업로드할 수 있습니다.'
    e.target.value = ''
    return
  }
  isUploading.value = true
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const filePath = `popups/popup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('notices')
      .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (uploadError) throw uploadError
    const { data: pub } = supabase.storage.from('notices').getPublicUrl(filePath)
    if (!pub?.publicUrl) throw new Error('업로드는 되었으나 공개 URL을 가져오지 못했습니다.')
    form.value.slides.push({ url: pub.publicUrl, link: '' })
  } catch (err) {
    console.error('[PopupAdmin] 이미지 업로드 실패:', err)
    formError.value = '이미지 업로드 실패: ' + (err.message || '알 수 없는 오류')
  } finally {
    isUploading.value = false
    e.target.value = ''
  }
}

const isValidYoutube = (raw) => {
  const v = (raw || '').trim()
  if (/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)[A-Za-z0-9_-]{11}/.test(v)) return true
  return /^[A-Za-z0-9_-]{11}$/.test(v)
}

const isValidLink = (v) => !v || /^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v)

async function save() {
  const f = form.value
  formError.value = ''

  if (!f.title.trim()) return (formError.value = '관리용 제목을 입력해 주세요.')
  if (!f.start_local || !f.end_local) return (formError.value = '노출 시작/종료 일시를 입력해 주세요.')
  const start = new Date(f.start_local)
  const end = new Date(f.end_local)
  if (!(end > start)) return (formError.value = '종료 일시는 시작 일시보다 늦어야 합니다.')
  if (!(Number(f.width_px) >= 100)) return (formError.value = '가로 크기는 100px 이상이어야 합니다.')
  if (f.media_type === 'image' && !(Number(f.height_px) >= 100)) return (formError.value = '세로 크기는 100px 이상이어야 합니다.')

  if (f.media_type === 'image') {
    if (f.slides.length === 0) return (formError.value = '이미지를 1장 이상 업로드해 주세요.')
    if (f.slides.some((s) => !isValidLink((s.link || '').trim()))) {
      return (formError.value = '이동 링크는 http(s):// 로 시작하거나 /경로 형식이어야 합니다.')
    }
  } else if (!isValidYoutube(f.youtube_url)) {
    return (formError.value = '유튜브 링크가 올바르지 않습니다.')
  }

  const isImage = f.media_type === 'image'
  const payload = {
    title: f.title.trim(),
    media_type: f.media_type,
    is_rolling: isImage ? f.is_rolling : false,
    rolling_interval_ms: Math.max(1, Number(rollingSeconds.value) || 4) * 1000,
    slides: isImage ? f.slides.map((s) => ({ url: s.url, link: (s.link || '').trim() })) : [],
    youtube_url: isImage ? null : f.youtube_url.trim(),
    video_aspect_ratio: f.video_aspect_ratio,
    width_px: Number(f.width_px),
    height_px: Number(f.height_px) || 500,
    position_preset: f.position_preset,
    offset_x: Number(f.offset_x) || 0,
    offset_y: Number(f.offset_y) || 0,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    is_active: f.is_active,
    display_order: Number(f.display_order) || 0,
    updated_at: new Date().toISOString()
  }

  isSaving.value = true
  try {
    if (editingId.value) {
      const { data, error } = await supabase.from('popups').update(payload).eq('id', editingId.value).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('수정된 행이 없습니다. 관리자 로그인 상태(권한)를 확인해 주세요.')
    } else {
      const { error } = await supabase.from('popups').insert(payload)
      if (error) throw error
    }
    closeModal()
    await loadPopups()
  } catch (err) {
    console.error('[PopupAdmin] 저장 실패:', err)
    formError.value = '저장 실패: ' + (err.message || '알 수 없는 오류')
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(p) {
  listError.value = ''
  const next = !p.is_active
  const { data, error } = await supabase
    .from('popups')
    .update({ is_active: next, updated_at: new Date().toISOString() })
    .eq('id', p.id)
    .select('id')
  if (error || !data || data.length === 0) {
    console.error('[PopupAdmin] 활성 토글 실패:', error)
    listError.value = '활성 상태 변경 실패: ' + (error?.message || '수정된 행이 없습니다. 관리자 로그인 상태(권한)를 확인해 주세요.')
    return
  }
  p.is_active = next
}

function askDelete(p) {
  pendingDelete.value = p
  confirmDelete.value = true
}

async function doDelete() {
  const p = pendingDelete.value
  if (!p) return
  listError.value = ''
  const { data, error } = await supabase.from('popups').delete().eq('id', p.id).select('id')
  if (error || !data || data.length === 0) {
    console.error('[PopupAdmin] 삭제 실패:', error)
    listError.value = '삭제 실패: ' + (error?.message || '삭제된 행이 없습니다. 관리자 로그인 상태(권한)를 확인해 주세요.')
    return
  }
  popups.value = popups.value.filter((x) => x.id !== p.id)
  pendingDelete.value = null
}

onMounted(loadPopups)
</script>
