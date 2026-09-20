<template>
  <!-- 9:16 영상 위젯 (site_settings video_widget_* 전용 / 긴급공지 팝업과 완전 별개)
       xl(1280px) 이상: 화면 우측 fixed(스크롤 따라다님). fixed 라 QuickMenu(fixed, 우측 20px·하단 24px·48×341px)와
         상시 같은 화면에 있으므로 처음부터 겹치지 않게 QuickMenu 바로 위 같은 우측 열에 쌓음
         · right-5(20px): QuickMenu 와 우측 정렬
         · bottom-[381px]: QuickMenu 하단 24 + 높이 341 + 간격 16
         · 화면 높이 < 740px: 위로 쌓으면 sticky 헤더(94px) 밑으로 잘리므로 QuickMenu 왼쪽(right-[84px])·하단(bottom-6)으로 대체
       xl 미만: 화면 좌측 하단 fixed 120px 9:16 카드 (우측 하단은 QuickMenu 사용) (HomeView.vue 에서만 마운트됨 — 몰/다른 페이지 미노출) -->
  <div v-if="isVisible" class="fixed left-4 bottom-5 z-[60] xl:left-auto xl:right-5 xl:bottom-[381px] xl:z-30 xl:[@media(max-height:739px)]:right-[84px] xl:[@media(max-height:739px)]:bottom-6">
    <!-- 작은 자동재생 상태 -->
    <button
      type="button"
      class="relative block w-[120px] aspect-[9/16] rounded-xl xl:w-[140px] xl:rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/50 ring-2 ring-white/40 xl:ring-1 xl:ring-white/20 hover:ring-white/60 hover:scale-[1.03] transition cursor-pointer"
      aria-label="영상 크게 보기"
      @click="openLightbox"
    >
      <video
        v-if="sourceType === 'upload'"
        ref="smallVideoRef"
        :src="uploadUrl"
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        class="absolute inset-0 w-full h-full object-cover pointer-events-none"
      ></video>
      <iframe
        v-else-if="!expanded"
        :src="smallEmbedUrl"
        class="absolute top-0 left-1/2 h-full max-w-none -translate-x-1/2 border-0 pointer-events-none"
        style="width: 316%"
        allow="autoplay; encrypted-media"
        referrerpolicy="strict-origin-when-cross-origin"
        tabindex="-1"
        title="영상 위젯"
      ></iframe>
      <span class="absolute bottom-2 right-8 px-2 py-0.5 rounded-full bg-black/60 text-[10px] font-bold text-white backdrop-blur-sm pointer-events-none">
        🔊 크게 보기
      </span>
    </button>

    <!-- 접기(X): 카드 button 안에 두면 button 중첩(잘못된 HTML)이라 형제 요소로 두고,
         카드 하단 "🔊 크게 보기" 라벨 바로 오른쪽(라벨 right-8 = X 20px + 여백 8px + 간격 4px)에 나란히 겹쳐 배치.
         @click.stop 으로 라이트박스가 열리지 않도록 확실히 차단 -->
    <button
      type="button"
      class="absolute bottom-2 right-2 z-10 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold leading-none flex items-center justify-center backdrop-blur-sm transition cursor-pointer"
      aria-label="영상 위젯 접기"
      @click.stop="dismissWidget"
    >
      ✕
    </button>

    <!-- 라이트박스 (소리 켜짐) -->
    <Teleport to="body">
      <div
        v-if="expanded"
        class="fixed inset-0 z-[9500] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        @click.self="closeLightbox"
      >
        <div
          class="relative bg-black rounded-2xl overflow-hidden shadow-2xl"
          style="aspect-ratio: 9 / 16; width: min(90vw, calc(85vh * 9 / 16))"
        >
          <video
            v-if="sourceType === 'upload'"
            ref="bigVideoRef"
            data-keep-sound="true"
            :src="uploadUrl"
            autoplay
            loop
            playsinline
            controls
            class="absolute inset-0 w-full h-full object-contain bg-black"
          ></video>
          <iframe
            v-else
            :src="bigEmbedUrl"
            class="absolute top-0 left-1/2 h-full max-w-none -translate-x-1/2 border-0"
            style="width: 316%"
            allow="autoplay; encrypted-media; fullscreen"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
            title="영상 위젯 (확대)"
          ></iframe>
        </div>
        <button
          type="button"
          class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl font-bold flex items-center justify-center transition cursor-pointer"
          aria-label="닫기"
          @click="closeLightbox"
        >
          ✕
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { currentSettings } from '../lib/settings'

const expanded = ref(false)
const smallVideoRef = ref(null)
const bigVideoRef = ref(null)

const enabled = computed(() => currentSettings.value?.video_widget_enabled === true)
const sourceType = computed(() =>
  currentSettings.value?.video_widget_source_type === 'upload' ? 'upload' : 'youtube'
)
const uploadUrl = computed(() => currentSettings.value?.video_widget_upload_url || '')

// 유튜브 URL → 영상 ID (watch / youtu.be / embed / shorts / ID 단독)
const youtubeId = computed(() => {
  const raw = (currentSettings.value?.video_widget_youtube_url || '').trim()
  if (!raw) return ''
  const m = raw.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : ''
})

// 설정상 그릴 수 있는 상태인가 (켜짐 + 선택한 소스 유효)
const hasSource = computed(() => {
  if (!enabled.value) return false
  return sourceType.value === 'upload' ? !!uploadUrl.value : !!youtubeId.value
})

// 접기(X): sessionStorage 유지 → 같은 탭 새로고침엔 계속 숨김, 탭을 닫고 새로 방문하면 다시 표시
const DISMISS_KEY = 'video_widget_dismissed'
const readDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch (e) {
    console.warn('[VideoWidget] sessionStorage 읽기 실패:', e)
    return false
  }
}
// setup 단계에서 동기 초기화 — onMounted 로 읽으면 첫 렌더에 잠깐 보였다 사라짐
const isDismissed = ref(readDismissed())
const dismissWidget = () => {
  isDismissed.value = true
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch (e) {
    console.warn('[VideoWidget] 접기 상태 저장 실패:', e)
  }
}

const isVisible = computed(() => hasSource.value && !isDismissed.value)

const buildEmbedUrl = (muted) => {
  const id = youtubeId.value
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    loop: '1',
    playlist: id,
    controls: muted ? '0' : '1',
    playsinline: '1',
    modestbranding: '1',
    rel: '0'
  })
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}
const smallEmbedUrl = computed(() => (youtubeId.value ? buildEmbedUrl(true) : ''))
const bigEmbedUrl = computed(() => (youtubeId.value ? buildEmbedUrl(false) : ''))

const openLightbox = async () => {
  const resumeAt = smallVideoRef.value?.currentTime || 0
  expanded.value = true
  document.body.style.overflow = 'hidden'
  if (sourceType.value === 'upload') {
    await nextTick()
    const big = bigVideoRef.value
    if (big) {
      big.currentTime = resumeAt
      big.muted = false
      // 클릭 제스처 직후 호출이라 소리 포함 재생 허용. 실패 시 원인 확인용 로그
      big.play().catch((err) => console.warn('[VideoWidget] 확대 재생 실패:', err))
    }
    smallVideoRef.value?.pause()
  }
}

const closeLightbox = async () => {
  expanded.value = false
  document.body.style.overflow = ''
  if (sourceType.value === 'upload') {
    await nextTick()
    smallVideoRef.value?.play().catch((err) => console.warn('[VideoWidget] 작은 영상 재생 복귀 실패:', err))
  }
}

const onKeydown = (e) => {
  if (e.key === 'Escape' && expanded.value) closeLightbox()
}

// 켜져 있는데 선택한 소스가 비어/잘못돼 렌더되지 않는 경우 조용히 넘기지 않고 경고
watch(
  [enabled, sourceType, youtubeId, uploadUrl],
  () => {
    if (!enabled.value || hasSource.value) return
    if (sourceType.value === 'youtube') {
      console.warn(
        '[VideoWidget] 유튜브 영상 ID를 추출하지 못해 위젯을 그리지 않습니다. video_widget_youtube_url =',
        currentSettings.value?.video_widget_youtube_url
      )
    } else {
      console.warn('[VideoWidget] video_widget_upload_url 이 비어 있어 위젯을 그리지 않습니다.')
    }
  },
  { immediate: true }
)

// 위젯이 꺼지거나 소스가 바뀌면 열려 있던 라이트박스도 닫음
watch(isVisible, (v) => {
  if (!v && expanded.value) {
    expanded.value = false
    document.body.style.overflow = ''
  }
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (expanded.value) document.body.style.overflow = ''
})
</script>
