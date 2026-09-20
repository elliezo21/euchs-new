<template>
  <!-- 9:16 영상 위젯 관리 (site_settings video_widget_* 전용 / 긴급공지 팝업과 완전 별개) -->
  <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
    <div class="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
        <h3 class="font-black text-slate-900 text-sm">5. 메인 9:16 영상 위젯 관리</h3>
      </div>
      <span class="text-xs text-slate-400 font-medium">히어로 우측 여백 · 데스크톱(1280px↑) 전용</span>
    </div>

    <div class="p-6 space-y-5">
      <!-- on/off 토글 -->
      <div class="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <div class="text-xs font-bold text-slate-800">영상 위젯 노출</div>
          <div class="text-[11px] text-slate-500 mt-0.5">끄면 메인 화면에 위젯이 렌더링되지 않습니다.</div>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="form.enabled"
          @click="form.enabled = !form.enabled"
          class="relative w-12 h-6 rounded-full transition cursor-pointer shrink-0"
          :class="form.enabled ? 'bg-rose-500' : 'bg-slate-300'"
        >
          <span
            class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
            :class="form.enabled ? 'translate-x-6' : ''"
          ></span>
        </button>
      </div>

      <!-- 소스 선택 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          v-for="opt in sourceOptions"
          :key="opt.value"
          class="flex items-center gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition"
          :class="form.sourceType === opt.value
            ? 'border-rose-500 bg-rose-50/40 font-black text-rose-900'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'"
        >
          <input
            type="radio"
            v-model="form.sourceType"
            :value="opt.value"
            class="w-4 h-4 text-rose-500 cursor-pointer"
          />
          <span class="text-xs sm:text-sm">{{ opt.label }}</span>
        </label>
      </div>

      <!-- 유튜브 선택 시: URL 입력만 -->
      <div v-if="form.sourceType === 'youtube'" class="space-y-2">
        <label class="text-xs font-bold text-slate-800">유튜브 링크</label>
        <input
          type="text"
          v-model="form.youtubeUrl"
          placeholder="예: https://www.youtube.com/shorts/XXXXXXXXXXX"
          class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:ring-2 focus:ring-rose-500"
        />
        <p class="text-[11px] text-slate-500">세로(Shorts) 영상을 권장합니다. 가로 영상은 9:16 틀에 맞춰 가운데가 잘려 보입니다.</p>
      </div>

      <!-- 업로드 선택 시: mp4 업로드 버튼만 -->
      <div v-else class="space-y-2">
        <label class="text-xs font-bold text-slate-800">mp4 파일 업로드</label>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="file"
            ref="fileInput"
            accept="video/mp4"
            class="hidden"
            @change="handleUpload"
          />
          <button
            type="button"
            :disabled="isUploading"
            @click="fileInput && fileInput.click()"
            class="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-500 text-rose-700 hover:text-white font-bold text-xs border border-rose-200 hover:border-rose-500 transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{{ isUploading ? '업로드 중...' : '📤 mp4 업로드' }}</span>
          </button>
          <span v-if="form.uploadUrl" class="text-[11px] text-emerald-600 font-bold break-all">
            ✓ 업로드 완료: {{ form.uploadUrl }}
          </span>
          <span v-else class="text-[11px] text-slate-400">아직 업로드된 파일이 없습니다.</span>
        </div>
        <p class="text-[11px] text-slate-500">업로드만으로는 반영되지 않으며, 아래 [저장하기]를 눌러야 메인 화면에 적용됩니다.</p>
      </div>

      <!-- 에러 -->
      <p v-if="errorMsg" class="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
        {{ errorMsg }}
      </p>

      <div class="flex items-center justify-between pt-1">
        <span class="text-[11px] text-slate-400 font-medium">{{ statusMsg }}</span>
        <button
          type="button"
          :disabled="isSaving || isUploading"
          @click="requestSave"
          class="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSaving ? '저장 중...' : '✓ 영상 위젯 설정 저장하기' }}
        </button>
      </div>
    </div>

    <ConfirmSaveModal
      v-model="confirmSave"
      title="9:16 영상 위젯 설정을 저장할까요?"
      description="저장 즉시 메인 화면 히어로 우측에 반영됩니다."
      variant="blue"
      confirmText="저장"
      @confirm="save"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fetchSiteSettings, saveVideoWidgetSettings } from '@/lib/settings'
import ConfirmSaveModal from '@/components/common/ConfirmSaveModal.vue'

const sourceOptions = [
  { value: 'youtube', label: '유튜브 링크' },
  { value: 'upload', label: '직접 업로드' }
]

const form = ref({
  enabled: false,
  sourceType: 'youtube',
  youtubeUrl: '',
  uploadUrl: ''
})
const fileInput = ref(null)
const isUploading = ref(false)
const isSaving = ref(false)
const confirmSave = ref(false)
const errorMsg = ref('')
const statusMsg = ref('')

const isValidYoutube = (raw) => {
  const v = (raw || '').trim()
  if (/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)[A-Za-z0-9_-]{11}/.test(v)) return true
  return /^[A-Za-z0-9_-]{11}$/.test(v)
}

async function load() {
  const s = await fetchSiteSettings()
  form.value = {
    enabled: s.video_widget_enabled === true,
    sourceType: s.video_widget_source_type === 'upload' ? 'upload' : 'youtube',
    youtubeUrl: s.video_widget_youtube_url || '',
    uploadUrl: s.video_widget_upload_url || ''
  }
  if (s.updated_at) statusMsg.value = '마지막 저장: ' + new Date(s.updated_at).toLocaleString('ko-KR')
}

async function handleUpload(e) {
  const file = e.target?.files?.[0]
  if (!file) return
  errorMsg.value = ''

  const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4')
  if (!isMp4) {
    errorMsg.value = 'mp4 파일만 업로드할 수 있습니다.'
    e.target.value = ''
    return
  }
  if (!isSupabaseConfigured()) {
    errorMsg.value = 'Supabase 설정이 필요합니다.'
    e.target.value = ''
    return
  }

  isUploading.value = true
  try {
    const filePath = `video_widget/widget_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp4`
    const { error: uploadError } = await supabase.storage
      .from('notices')
      .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: 'video/mp4' })
    if (uploadError) throw uploadError

    const { data: pub } = supabase.storage.from('notices').getPublicUrl(filePath)
    if (!pub?.publicUrl) throw new Error('업로드는 되었으나 공개 URL을 가져오지 못했습니다.')
    form.value.uploadUrl = pub.publicUrl
  } catch (err) {
    console.error('[VideoWidgetAdmin] mp4 업로드 실패:', err)
    errorMsg.value = '업로드 실패: ' + (err.message || '알 수 없는 오류')
  } finally {
    isUploading.value = false
    e.target.value = ''
  }
}

function requestSave() {
  errorMsg.value = ''
  // 켜져 있는데 선택한 소스가 비어 있으면 저장 차단 (화면엔 안 뜨는 위젯이 "저장 성공"으로 보이는 것 방지)
  if (form.value.enabled) {
    if (form.value.sourceType === 'youtube' && !isValidYoutube(form.value.youtubeUrl)) {
      errorMsg.value = '유튜브 링크가 올바르지 않습니다. (watch / youtu.be / shorts / embed 링크 또는 11자리 영상 ID)'
      return
    }
    if (form.value.sourceType === 'upload' && !form.value.uploadUrl) {
      errorMsg.value = 'mp4 파일을 먼저 업로드해 주세요.'
      return
    }
  }
  confirmSave.value = true
}

async function save() {
  isSaving.value = true
  errorMsg.value = ''
  try {
    await saveVideoWidgetSettings({
      enabled: form.value.enabled,
      sourceType: form.value.sourceType,
      youtubeUrl: form.value.youtubeUrl,
      uploadUrl: form.value.uploadUrl
    })
    statusMsg.value = '저장 완료: ' + new Date().toLocaleString('ko-KR')
  } catch (err) {
    errorMsg.value = '저장 실패: ' + (err.message || '알 수 없는 오류')
  } finally {
    isSaving.value = false
  }
}

onMounted(load)
</script>
