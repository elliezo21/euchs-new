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
        :key="smallIframeKey"
        ref="smallIframeRef"
        :src="smallEmbedUrl"
        @load="onSmallIframeLoad"
        class="absolute top-0 left-1/2 h-full max-w-none -translate-x-1/2 border-0 pointer-events-none"
        style="width: 316%"
        allow="autoplay; encrypted-media"
        referrerpolicy="strict-origin-when-cross-origin"
        tabindex="-1"
        title="영상 위젯"
      ></iframe>
      <span class="absolute bottom-2 right-8 px-2 py-0.5 rounded-full bg-black/60 text-[11px] font-bold text-white backdrop-blur-sm pointer-events-none">
        🔊 크게 보기
      </span>
    </button>

    <!-- 접기(X): 카드 button 안에 두면 button 중첩(잘못된 HTML)이라 형제 요소로 두고,
         카드 하단 "🔊 크게 보기" 라벨 바로 오른쪽(라벨 right-8 = X 20px + 여백 8px + 간격 4px)에 나란히 겹쳐 배치.
         @click.stop 으로 라이트박스가 열리지 않도록 확실히 차단 -->
    <button
      type="button"
      class="absolute bottom-2 right-2 z-10 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white text-[11px] font-bold leading-none flex items-center justify-center backdrop-blur-sm transition cursor-pointer"
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
const extractYoutubeId = (rawUrl) => {
  const raw = (typeof rawUrl === 'string' ? rawUrl : '').trim()
  if (!raw) return ''
  const m = raw.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : ''
}

const MAX_YOUTUBE_IDS = 3

// 로테이션 대상 영상 ID 목록: video_widget_youtube_urls(배열) 우선, 배열이 비어 있을 때만 레거시 단일 필드로 폴백
const youtubeIds = computed(() => {
  const urls = currentSettings.value?.video_widget_youtube_urls
  const source = Array.isArray(urls) && urls.length ? urls : [currentSettings.value?.video_widget_youtube_url]
  return source.map(extractYoutubeId).filter(Boolean).slice(0, MAX_YOUTUBE_IDS)
})
const youtubeIdsKey = computed(() => youtubeIds.value.join(','))

// 현재 재생 중인 인덱스 (2개 이상일 때만 이동, 1개면 항상 0)
const currentIndex = ref(0)
const youtubeId = computed(() => youtubeIds.value[currentIndex.value] || '')
const isRotating = computed(() => sourceType.value === 'youtube' && youtubeIds.value.length >= 2)

// 설정상 그릴 수 있는 상태인가 (켜짐 + 선택한 소스 유효)
const hasSource = computed(() => {
  if (!enabled.value) return false
  return sourceType.value === 'upload' ? !!uploadUrl.value : youtubeIds.value.length > 0
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

const YT_ORIGIN = 'https://www.youtube.com'

const buildEmbedUrl = (muted) => {
  const id = youtubeId.value
  const base = {
    autoplay: '1',
    mute: muted ? '1' : '0',
    controls: muted ? '0' : '1',
    playsinline: '1',
    modestbranding: '1',
    rel: '0'
  }
  // 작은 카드 + 영상 2개 이상: 반복재생(loop/playlist) 대신 종료 감지로 다음 영상 전환 → JS API 사용
  // 그 외(영상 1개, 라이트박스): 기존 그대로 loop=1&playlist 무한 반복
  const params =
    muted && isRotating.value
      ? new URLSearchParams({ ...base, enablejsapi: '1', origin: window.location.origin })
      : new URLSearchParams({ ...base, loop: '1', playlist: id })
  return `${YT_ORIGIN}/embed/${id}?${params.toString()}`
}
const smallEmbedUrl = computed(() => (youtubeId.value ? buildEmbedUrl(true) : ''))
const bigEmbedUrl = computed(() => (youtubeId.value ? buildEmbedUrl(false) : ''))

// ---- 유튜브 로테이션: iframe postMessage(JS API)로 재생 종료를 감지해 다음 영상으로 전환 ----
const smallIframeRef = ref(null)
// 영상이 바뀔 때마다 iframe 을 새로 만들어 load 이벤트/리스닝 핸드셰이크가 매번 깨끗하게 시작되게 함
const smallIframeKey = computed(() => `${currentIndex.value}-${youtubeId.value}`)

let listenTimer = null
let stallTimer = null
let gotYoutubeMessage = false
let playbackSeen = false // 이번 영상에서 실제 재생(playerState 1 / currentTime 진행)이 확인됐는가
let advancedThisLoad = false // 한 영상에서 종료 이벤트가 중복 도착해도 한 번만 전환
let consecutiveErrors = 0

const stopListening = () => {
  if (listenTimer) clearInterval(listenTimer)
  listenTimer = null
}
const stopStallWatch = () => {
  if (stallTimer) clearTimeout(stallTimer)
  stallTimer = null
}

// 공식 IFrame API 와 동일한 핸드셰이크: listening 등록 + 상태/오류 이벤트 명시 구독
// (플레이어 버전에 따라 listening 만으로는 상태 이벤트를 안 보내는 경우를 대비)
const sendListening = () => {
  const win = smallIframeRef.value?.contentWindow
  if (!win) return
  const post = (payload) => win.postMessage(JSON.stringify({ ...payload, id: 'videoWidget', channel: 'widget' }), YT_ORIGIN)
  post({ event: 'listening' })
  post({ event: 'command', func: 'addEventListener', args: ['onStateChange'] })
  post({ event: 'command', func: 'addEventListener', args: ['onError'] })
}

const onSmallIframeLoad = () => {
  if (!isRotating.value) return
  stopListening()
  stopStallWatch()
  gotYoutubeMessage = false
  playbackSeen = false
  advancedThisLoad = false
  // 재생이 안 시작되면 조용히 멈춰 보이므로 원인 힌트를 콘솔에 남김
  // (유튜브는 탭이 백그라운드/창이 가려진 상태(visibilityState=hidden)에서는 자동재생을 시작하지 않음 → 영상이 안 끝나니 전환도 없음)
  stallTimer = setTimeout(() => {
    if (playbackSeen) return
    console.warn(
      `[VideoWidget] 15초가 지나도 영상 재생이 시작되지 않았습니다. document.visibilityState=${document.visibilityState}. ` +
        '탭이 백그라운드이거나 창이 가려져 있으면 유튜브가 재생을 시작하지 않아 자동 전환도 일어나지 않습니다. id =',
      youtubeId.value
    )
  }, 15000)
  sendListening()
  let tries = 0
  // 플레이어 준비 시점이 불확실하므로 응답이 올 때까지 0.5초 간격으로 재시도 (최대 10초)
  listenTimer = setInterval(() => {
    if (gotYoutubeMessage) return stopListening()
    if (++tries > 20) {
      stopListening()
      console.warn('[VideoWidget] 유튜브 플레이어로부터 상태 응답이 없어 자동 전환을 시작하지 못했습니다. id =', youtubeId.value)
      return
    }
    sendListening()
  }, 500)
}

const advanceToNext = () => {
  if (advancedThisLoad) return
  advancedThisLoad = true
  currentIndex.value = (currentIndex.value + 1) % youtubeIds.value.length
}

const parseYoutubeMessage = (raw) => {
  if (raw && typeof raw === 'object') return raw
  if (typeof raw !== 'string') return null
  // 유튜브 외 다른 스크립트가 보낸 JSON 이 아닌 message 는 정상적으로 무시
  try {
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

const onYoutubeMessage = (e) => {
  if (!isRotating.value || e.origin !== YT_ORIGIN) return
  const frame = smallIframeRef.value
  if (!frame || e.source !== frame.contentWindow) return
  const data = parseYoutubeMessage(e.data)
  if (!data) return
  gotYoutubeMessage = true

  const state = data.event === 'infoDelivery' ? data.info?.playerState : data.event === 'onStateChange' ? data.info : undefined
  if (state === 1 || (data.event === 'infoDelivery' && data.info?.currentTime > 0)) playbackSeen = true
  if (state === 1) consecutiveErrors = 0
  if (state === 0) {
    advanceToNext()
    return
  }
  if (data.event === 'onError') {
    consecutiveErrors += 1
    console.warn('[VideoWidget] 유튜브 재생 오류(코드', data.info, ') — 다음 영상으로 건너뜁니다. id =', youtubeId.value)
    if (consecutiveErrors >= youtubeIds.value.length) {
      console.warn('[VideoWidget] 등록된 모든 영상이 연속으로 재생 실패해 자동 전환을 중단합니다.')
      return
    }
    advanceToNext()
  }
}

// 영상 목록(개수/순서/내용)이 바뀌면 처음부터 다시
watch(youtubeIdsKey, () => {
  currentIndex.value = 0
  consecutiveErrors = 0
})

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
  [enabled, sourceType, youtubeIdsKey, uploadUrl],
  () => {
    if (!enabled.value || hasSource.value) return
    if (sourceType.value === 'youtube') {
      console.warn(
        '[VideoWidget] 유효한 유튜브 영상 ID가 없어 위젯을 그리지 않습니다. video_widget_youtube_urls =',
        currentSettings.value?.video_widget_youtube_urls,
        ', video_widget_youtube_url(레거시) =',
        currentSettings.value?.video_widget_youtube_url
      )
    } else {
      console.warn('[VideoWidget] video_widget_upload_url 이 비어 있어 위젯을 그리지 않습니다.')
    }
  },
  { immediate: true }
)

// 라이트박스가 열리면 작은 iframe 이 사라지므로 핸드셰이크 재시도/정체 감시 타이머 정리
watch(expanded, (v) => {
  if (v) {
    stopListening()
    stopStallWatch()
  }
})

// 위젯이 꺼지거나 소스가 바뀌면 열려 있던 라이트박스도 닫음
watch(isVisible, (v) => {
  if (!v && expanded.value) {
    expanded.value = false
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('message', onYoutubeMessage)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('message', onYoutubeMessage)
  stopListening()
  stopStallWatch()
  if (expanded.value) document.body.style.overflow = ''
})
</script>
