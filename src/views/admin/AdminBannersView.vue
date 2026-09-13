<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

    <!-- 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-black text-slate-900">메인 배너 관리</h1>
        <p class="text-sm text-slate-500 mt-0.5">메인 소싱몰 상단 롤링 배너를 관리합니다.</p>
      </div>
      <button type="button" @click="openAddModal"
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition cursor-pointer">
        <i class="fas fa-plus text-xs"></i>
        배너 추가
      </button>
    </div>

    <!-- 배너 목록 -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-slate-400">
        <i class="fas fa-spinner fa-spin text-2xl mb-2 block"></i>불러오는 중...
      </div>
      <div v-else-if="banners.length === 0" class="p-10 text-center text-slate-400">
        <i class="fas fa-image text-4xl mb-3 block text-slate-200"></i>
        <p class="font-bold">등록된 배너가 없습니다.</p>
        <p class="text-sm mt-1">위의 "배너 추가" 버튼으로 첫 배너를 등록하세요.</p>
      </div>
      <div v-else class="divide-y divide-slate-100">
        <div v-for="banner in banners" :key="banner.id"
          class="flex items-center gap-4 p-4 hover:bg-slate-50 transition">
          <!-- 썸네일 -->
          <div class="w-24 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            <img :src="banner.image_url" :alt="banner.title || '배너'"
              class="w-full h-full object-cover" @error="handleImgError" />
          </div>
          <!-- 정보 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-bold text-slate-800 text-sm truncate">{{ banner.title || '(제목 없음)' }}</p>
              <span :class="['px-2 py-0.5 rounded text-[10px] font-bold', banner.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500']">
                {{ banner.is_active ? '노출중' : '비활성' }}
              </span>
              <span :class="['px-2 py-0.5 rounded text-[10px] font-bold border', banner.slot === 'right' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200']">
                {{ banner.slot === 'right' ? '오른쪽 칸' : '왼쪽 칸' }}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5 truncate">
              {{ banner.link_url || '링크 없음' }}
              <span v-if="banner.link_type === 'external'" class="ml-1 text-blue-400">(외부링크)</span>
            </p>
            <p class="text-[11px] text-slate-400 mt-0.5">
              순서 {{ banner.display_order }}
              <template v-if="banner.start_date || banner.end_date">
                · {{ banner.start_date || '–' }} ~ {{ banner.end_date || '무기한' }}
              </template>
            </p>
          </div>
          <!-- 액션 버튼 -->
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" @click="toggleActive(banner)"
              :class="['px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer', banner.is_active ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700']">
              {{ banner.is_active ? '비활성화' : '활성화' }}
            </button>
            <button type="button" @click="openEditModal(banner)"
              class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer">
              수정
            </button>
            <button type="button" @click="deleteBanner(banner)"
              class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer">
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 배너 추가/수정 모달 -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="closeModal">
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-black text-slate-900">{{ editingBanner ? '배너 수정' : '배너 추가' }}</h2>
              <button @click="closeModal" class="text-slate-400 hover:text-slate-600 p-1 cursor-pointer text-lg">✕</button>
            </div>

            <!-- 슬롯 선택 (왼쪽/오른쪽 칸) -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">노출 칸 <span class="text-rose-500">*</span></label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="opt in [{ value: 'left', label: '왼쪽 칸', sub: '어두운 OEM 카드 영역', color: 'indigo' }, { value: 'right', label: '오른쪽 칸', sub: '주황 프로모 카드 영역', color: 'orange' }]"
                  :key="opt.value"
                  :class="['flex flex-col gap-0.5 p-3 rounded-xl border-2 cursor-pointer transition',
                    form.slot === opt.value
                      ? (opt.color === 'indigo' ? 'border-indigo-500 bg-indigo-50' : 'border-orange-500 bg-orange-50')
                      : 'border-slate-200 hover:border-slate-300 bg-white']"
                >
                  <input type="radio" v-model="form.slot" :value="opt.value" class="sr-only" />
                  <span :class="['text-xs font-black', form.slot === opt.value ? (opt.color === 'indigo' ? 'text-indigo-700' : 'text-orange-700') : 'text-slate-700']">{{ opt.label }}</span>
                  <span class="text-[10px] text-slate-400 font-medium">{{ opt.sub }}</span>
                </label>
              </div>
            </div>

            <!-- 이미지 업로드 -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">배너 이미지 <span class="text-slate-400 font-medium">(없으면 그라데이션 배경 사용)</span></label>
              <div class="relative">
                <div v-if="form.image_url" class="mb-2 rounded-xl overflow-hidden bg-slate-100 h-32 relative">
                  <img :src="form.image_url" alt="미리보기" class="w-full h-full object-cover" />
                  <button @click="form.image_url = ''" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white text-xs hover:bg-black/70 flex items-center justify-center cursor-pointer">✕</button>
                </div>
                <label class="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl cursor-pointer transition text-sm text-slate-500 hover:text-blue-600">
                  <i class="fas fa-cloud-upload-alt"></i>
                  <span>{{ isUploading ? '업로드 중...' : '이미지 클릭하여 업로드 (JPEG/PNG/WebP, 5MB 이하)' }}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleImageUpload" :disabled="isUploading" />
                </label>
              </div>
            </div>

            <!-- 링크 URL -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">클릭 링크 URL</label>
              <input v-model="form.link_url" type="text" placeholder="예: /services/trade-agent 또는 https://..." class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
            </div>

            <!-- 링크 유형 -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">링크 유형</label>
              <div class="flex gap-3">
                <label v-for="opt in [{ value: 'internal', label: '내부 라우트 (Vue Router)' }, { value: 'external', label: '외부 링크 (새 탭)' }]" :key="opt.value"
                  class="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" v-model="form.link_type" :value="opt.value" class="accent-blue-600" />
                  {{ opt.label }}
                </label>
              </div>
            </div>

            <!-- 관리용 제목 -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">관리용 제목 (배너에 미노출)</label>
              <input v-model="form.title" type="text" placeholder="예: OEM/ODM 배너 2026년 9월" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
            </div>

            <!-- 서브 문구 (레거시 — 호환 유지) -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">서브 문구 <span class="text-slate-400 font-medium">(하단 자막, 선택)</span></label>
              <input v-model="form.subtitle" type="text" placeholder="예: 2026 베스트 소싱 기획전 – 지금 확인하세요" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
            </div>

            <!-- 카드 텍스트 콘텐츠 구분선 -->
            <div class="border-t border-slate-100 pt-1">
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">카드 텍스트 콘텐츠</p>

              <!-- 라벨 뱃지 -->
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">상단 라벨 뱃지 <span class="text-slate-400 font-medium">(예: B2B CUSTOM MADE)</span></label>
                  <input v-model="form.label" type="text" placeholder="예: B2B CUSTOM MADE / 2026 베스트 소싱 기획전" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
                </div>

                <!-- 제목 (heading) -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">카드 큰 제목 <span class="text-slate-400 font-medium">(예: OEM / ODM 제작관)</span></label>
                  <input v-model="form.heading" type="text" placeholder="예: OEM / ODM 제작관" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
                </div>

                <!-- 설명 문구 -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">설명 문구</label>
                  <textarea v-model="form.description" rows="2" placeholder="예: 로고 인쇄, 커스텀 패키지, 금형 사출 제작까지 1:1 밀착 대행합니다." class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition resize-none"></textarea>
                </div>

                <!-- CTA 버튼 -->
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">버튼 문구</label>
                    <input v-model="form.button_text" type="text" placeholder="예: 맞춤 제작 상담 신청" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1.5">버튼 링크</label>
                    <input v-model="form.button_url" type="text" placeholder="예: /services/trade-agent" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 노출 순서 -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">노출 순서 (낮을수록 먼저)</label>
                <input v-model.number="form.display_order" type="number" min="0" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">활성 상태</label>
                <div class="flex items-center h-10">
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="form.is_active" class="sr-only peer" />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                    <span class="ml-2 text-sm font-medium text-slate-700">{{ form.is_active ? '활성' : '비활성' }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 노출 기간 (선택) -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">노출 시작일 (선택)</label>
                <input v-model="form.start_date" type="date" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">노출 종료일 (선택)</label>
                <input v-model="form.end_date" type="date" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
              </div>
            </div>

            <!-- 에러 메시지 -->
            <p v-if="formError" class="text-xs text-rose-600 font-bold">{{ formError }}</p>

            <!-- 저장 버튼 -->
            <div class="flex gap-3 pt-2">
              <button type="button" @click="closeModal" class="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition cursor-pointer">취소</button>
              <button type="button" @click="saveBanner" :disabled="isSaving"
                class="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition cursor-pointer flex items-center justify-center gap-2">
                <i v-if="isSaving" class="fas fa-spinner fa-spin text-xs"></i>
                {{ isSaving ? '저장 중...' : (editingBanner ? '수정 저장' : '배너 추가') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'

const banners = ref([])
const isLoading = ref(false)
const isModalOpen = ref(false)
const isSaving = ref(false)
const isUploading = ref(false)
const editingBanner = ref(null)
const formError = ref('')

const defaultForm = () => ({
  slot: 'left',
  image_url: '',
  link_url: '',
  link_type: 'internal',
  title: '',
  subtitle: '',
  label: '',
  heading: '',
  description: '',
  button_text: '',
  button_url: '',
  display_order: 0,
  is_active: true,
  start_date: null,
  end_date: null
})
const form = ref(defaultForm())

async function loadBanners() {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('display_order', { ascending: true })
    if (!error && data) banners.value = data
  } finally {
    isLoading.value = false
  }
}

function openAddModal() {
  editingBanner.value = null
  form.value = defaultForm()
  formError.value = ''
  isModalOpen.value = true
}

function openEditModal(banner) {
  editingBanner.value = banner
  form.value = { ...banner }
  formError.value = ''
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  editingBanner.value = null
  formError.value = ''
}

async function handleImageUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    formError.value = '5MB 이하의 이미지만 업로드 가능합니다.'
    return
  }
  isUploading.value = true
  formError.value = ''
  try {
    const ext = file.name.split('.').pop()
    const fileName = `banner_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('banners')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(data.path)
    form.value.image_url = urlData.publicUrl
  } catch (err) {
    formError.value = '이미지 업로드 실패: ' + (err.message || '알 수 없는 오류')
  } finally {
    isUploading.value = false
  }
}

async function saveBanner() {
  if (!form.value.image_url) {
    formError.value = '배너 이미지를 업로드해 주세요.'
    return
  }
  isSaving.value = true
  formError.value = ''
  try {
    const payload = { ...form.value }
    if (!payload.start_date) payload.start_date = null
    if (!payload.end_date) payload.end_date = null

    let error
    if (editingBanner.value) {
      ;({ error } = await supabase.from('banners').update(payload).eq('id', editingBanner.value.id))
    } else {
      delete payload.id
      ;({ error } = await supabase.from('banners').insert(payload))
    }
    if (error) throw error
    closeModal()
    await loadBanners()
  } catch (err) {
    formError.value = '저장 실패: ' + (err.message || '알 수 없는 오류')
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(banner) {
  const { error } = await supabase.from('banners').update({ is_active: !banner.is_active }).eq('id', banner.id)
  if (!error) banner.is_active = !banner.is_active
}

async function deleteBanner(banner) {
  if (!confirm(`"${banner.title || '이 배너'}"를 삭제하시겠습니까?`)) return
  const { error } = await supabase.from('banners').delete().eq('id', banner.id)
  if (!error) banners.value = banners.value.filter(b => b.id !== banner.id)
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&auto=format&fit=crop&q=60'
}

onMounted(loadBanners)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
