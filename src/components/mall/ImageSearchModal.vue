<template>
  <!-- 백드롭 -->
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        @keydown.esc.window="close"
      >
        <!-- 반투명 배경 -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

        <!-- 모달 카드 -->
        <div
          class="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          @click.stop
        >
          <!-- 헤더 -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm">
                <i class="fas fa-camera text-white text-sm"></i>
              </span>
              <span class="font-black text-slate-800 text-sm">이미지로 더 정확한 상품 검색</span>
            </div>
            <button
              type="button"
              @click="close"
              class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>

          <!-- 본문 -->
          <div class="p-5 space-y-4">

            <!-- 드롭존 영역 -->
            <div
              class="relative rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center py-10 px-6 gap-3 cursor-pointer select-none"
              :class="isDragOver
                ? 'border-orange-400 bg-orange-50'
                : 'border-slate-300 bg-slate-50 hover:border-orange-300 hover:bg-orange-50/40'"
              @dragover.prevent="isDragOver = true"
              @dragleave.prevent="isDragOver = false"
              @drop.prevent="onDrop"
              @click="triggerFileInput"
            >
              <!-- 미리보기 이미지 (파일 선택 후) -->
              <div v-if="previewUrl" class="flex flex-col items-center gap-2">
                <img
                  :src="previewUrl"
                  alt="선택된 이미지"
                  class="w-28 h-28 object-cover rounded-xl border border-slate-200 shadow-sm"
                />
                <span class="text-xs text-slate-500 font-medium">{{ selectedFileName }}</span>
              </div>

              <!-- 기본 상태 아이콘 -->
              <template v-else>
                <div
                  class="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm"
                  :class="isDragOver ? 'bg-orange-100' : 'bg-white border border-slate-200'"
                >
                  <i
                    class="fas text-2xl"
                    :class="isDragOver ? 'fa-cloud-download-alt text-orange-500' : 'fa-image text-slate-400'"
                  ></i>
                </div>
                <p class="text-sm font-semibold text-slate-600 mt-1">
                  {{ isDragOver ? '이미지를 여기에 놓으세요' : '이미지를 드래그하거나 업로드하세요' }}
                </p>
              </template>

              <!-- 주황색 이미지 업로드 버튼 -->
              <button
                type="button"
                @click.stop="triggerFileInput"
                :disabled="isProcessing"
                class="mt-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm transition-all text-sm disabled:opacity-60 cursor-pointer"
              >
                <i class="fas fa-spinner fa-spin mr-1.5" v-if="isProcessing &amp;&amp; !urlMode"></i>
                <i class="fas fa-upload mr-1.5" v-else></i>
                {{ previewUrl ? '다른 이미지 선택' : '이미지 업로드' }}
              </button>

              <p class="text-xs text-slate-400 mt-1">파일을 여기로 드래그 하거나 클릭후 업로드</p>

              <!-- hidden file input -->
              <input
                ref="fileInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                class="hidden"
                @change="onFileChange"
              />
            </div>

            <!-- 처리 진행 상태 바 -->
            <div v-if="isProcessing" class="flex items-center gap-2 px-3 py-2.5 bg-orange-50 rounded-lg border border-orange-100">
              <i class="fas fa-spinner fa-spin text-orange-500 text-xs"></i>
              <span class="text-xs text-orange-700 font-medium">{{ processingMessage }}</span>
            </div>

            <!-- 구분선 -->
            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-slate-200"></div>
              <span class="text-xs text-slate-400 font-medium">또는</span>
              <div class="flex-1 h-px bg-slate-200"></div>
            </div>

            <!-- 이미지 URL 입력 -->
            <div class="space-y-2">
              <p class="text-xs font-semibold text-slate-600">이미지 링크로 검색</p>
              <div class="flex gap-2">
                <input
                  v-model="imageUrlInput"
                  type="url"
                  placeholder="이미지 링크를 여기에 붙여넣기 (https://...)"
                  class="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition placeholder:text-slate-400"
                  :disabled="isProcessing"
                  @keydown.enter.prevent="searchByUrl"
                />
                <button
                  type="button"
                  @click="searchByUrl"
                  :disabled="isProcessing || !imageUrlInput.trim()"
                  class="shrink-0 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <i class="fas fa-spinner fa-spin" v-if="isProcessing &amp;&amp; urlMode"></i>
                  <span v-else>검색</span>
                </button>
              </div>
            </div>

            <!-- 에러 메시지 -->
            <div v-if="errorMsg" class="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100 text-xs text-red-600">
              <i class="fas fa-exclamation-circle"></i>
              {{ errorMsg }}
            </div>

          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from '../../lib/supabase'
import { search1688ByImageUrl } from '../../services/api1688'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'search-start', 'search-done', 'search-error'])

const fileInputRef = ref(null)
const isDragOver = ref(false)
const previewUrl = ref('')
const selectedFileName = ref('')
const selectedFile = ref(null)
const imageUrlInput = ref('')
const isProcessing = ref(false)
const processingMessage = ref('')
const urlMode = ref(false)
const errorMsg = ref('')

function close() {
  if (isProcessing.value) return
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (val) => {
  if (!val) setTimeout(resetState, 300)
})

function resetState() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  selectedFileName.value = ''
  selectedFile.value = null
  imageUrlInput.value = ''
  isDragOver.value = false
  isProcessing.value = false
  processingMessage.value = ''
  urlMode.value = false
  errorMsg.value = ''
}

function triggerFileInput() {
  if (isProcessing.value) return
  fileInputRef.value?.click()
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''
  handleFile(file)
}

function onDrop(e) {
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    errorMsg.value = '이미지 파일(JPG, PNG, WEBP)만 지원합니다.'
    return
  }
  handleFile(file)
}

async function handleFile(file) {
  errorMsg.value = ''
  if (!file.type.startsWith('image/')) {
    errorMsg.value = '이미지 파일(JPG, PNG, WEBP)만 지원합니다.'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    errorMsg.value = '파일 크기는 10MB 이하여야 합니다.'
    return
  }

  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  selectedFileName.value = file.name
  selectedFile.value = file

  isProcessing.value = true
  urlMode.value = false
  processingMessage.value = '이미지 업로드 중...'
  emit('search-start')

  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `imgsearch/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('notices')
      .upload(fileName, file, { upsert: true, contentType: file.type })

    if (upErr) {
      errorMsg.value = `이미지 업로드 실패: ${upErr.message}`
      isProcessing.value = false
      emit('search-error', upErr.message)
      return
    }

    const { data: urlData } = supabase.storage.from('notices').getPublicUrl(fileName)
    const publicUrl = urlData?.publicUrl || ''

    if (!publicUrl) {
      errorMsg.value = 'Supabase 공개 URL 생성에 실패했습니다.'
      isProcessing.value = false
      emit('search-error', 'no public url')
      return
    }

    processingMessage.value = '1688 유사 상품 검색 중...'
    await runImageSearch(publicUrl)
  } catch (err) {
    console.error('[ImageSearchModal] handleFile error:', err)
    errorMsg.value = '이미지 처리 중 오류가 발생했습니다.'
    isProcessing.value = false
    emit('search-error', err.message)
  }
}

async function searchByUrl() {
  const url = imageUrlInput.value.trim()
  if (!url) return
  if (!url.startsWith('http')) {
    errorMsg.value = 'https:// 로 시작하는 올바른 이미지 URL을 입력해 주세요.'
    return
  }
  errorMsg.value = ''
  isProcessing.value = true
  urlMode.value = true
  processingMessage.value = '1688 유사 상품 검색 중...'
  emit('search-start')
  await runImageSearch(url)
}

async function runImageSearch(publicUrl) {
  try {
    const result = await search1688ByImageUrl(publicUrl)

    if (!result.success) {
      const code = result.error?.data?.code
      if (code === 5011) {
        errorMsg.value = 'GIF 이미지는 지원되지 않습니다. JPG/PNG/WEBP를 사용해 주세요.'
      } else if (code === 5005) {
        errorMsg.value = '이미지 서버 응답이 느립니다. 잠시 후 다시 시도해 주세요.'
      } else {
        errorMsg.value = '유사 상품을 찾지 못했습니다. 다른 이미지로 시도해 보세요.'
      }
      isProcessing.value = false
      emit('search-error', result.error)
      return
    }

    emit('search-done', { items: result.items, totalResults: result.totalResults, previewUrl: previewUrl.value })
    emit('update:modelValue', false)
  } catch (err) {
    console.error('[ImageSearchModal] runImageSearch error:', err)
    errorMsg.value = '검색 중 오류가 발생했습니다.'
    emit('search-error', err.message)
  } finally {
    isProcessing.value = false
  }
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
