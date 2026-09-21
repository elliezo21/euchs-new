<template>
  <!-- 긴급공지 팝업 (popups 테이블 전용 / 9:16 영상 위젯과 완전 별개) -->
  <Teleport to="body">
    <div
      v-for="(p, idx) in visiblePopups"
      :key="p.id"
      class="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
      :style="popupStyle(p, idx)"
      role="dialog"
      aria-label="긴급공지"
    >
      <!-- 본문: 이미지 / 롤링 이미지 / 유튜브 -->
      <div class="relative w-full shrink-0 bg-slate-900" :style="mediaStyle(p)">
        <template v-if="p.media_type === 'video_youtube'">
          <iframe
            v-if="youtubeId(p.youtube_url)"
            :src="youtubeEmbed(p.youtube_url)"
            class="absolute inset-0 w-full h-full border-0"
            allow="autoplay; encrypted-media; fullscreen"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
            :title="p.title"
          ></iframe>
        </template>
        <template v-else>
          <template v-for="(s, i) in slidesOf(p)" :key="i">
            <component
              :is="safeLink(s.link) ? 'a' : 'div'"
              v-show="i === currentSlide(p)"
              :href="safeLink(s.link) || undefined"
              :target="safeLink(s.link) && /^https?:/i.test(s.link) ? '_blank' : undefined"
              rel="noopener noreferrer"
              class="absolute inset-0 block"
            >
              <img :src="s.url" :alt="p.title" class="w-full h-full object-contain bg-white" />
            </component>
          </template>
          <div v-if="isRolling(p)" class="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
            <span
              v-for="(s, i) in slidesOf(p)"
              :key="i"
              class="w-2 h-2 rounded-full shadow"
              :class="i === currentSlide(p) ? 'bg-slate-900' : 'bg-slate-900/30'"
            ></span>
          </div>
        </template>
      </div>

      <!-- 하단 바 -->
      <div class="flex items-center gap-2 px-3 h-9 bg-slate-900 text-white text-xs shrink-0">
        <button type="button" class="shrink-0 hover:text-amber-300 transition cursor-pointer" @click="hideToday(p)">
          오늘 하루 보지 않기
        </button>
        <button type="button" class="min-w-0 truncate hover:text-amber-300 transition cursor-pointer" @click="hideUntilEnd(p)">
          이 팝업 다시 보지 않기(게재기간 동안)
        </button>
        <button type="button" class="ml-auto shrink-0 font-bold hover:text-amber-300 transition cursor-pointer" @click="closePopup(p)">
          닫기 ✕
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const popups = ref([])
const closedIds = ref(new Set())
const slideIndex = ref({}) // { [popupId]: number }
let rollingTimers = []

// 숨김 만료 시각(epoch ms)을 popup_hide_{id}_until 키에 저장.
//  - 오늘 하루 보지 않기: 오늘 자정(다음 로컬 00:00)
//  - 게재기간 동안 다시 안 보기: 해당 팝업의 end_date
const hideKey = (id) => `popup_hide_${id}_until`
const isHidden = (id) => {
  try {
    const until = Number(localStorage.getItem(hideKey(id)))
    return Number.isFinite(until) && until > Date.now()
  } catch (e) {
    console.warn('[EmergencyPopup] localStorage 읽기 실패:', e)
    return false
  }
}
const saveHideUntil = (p, untilMs) => {
  try {
    localStorage.setItem(hideKey(p.id), String(untilMs))
  } catch (e) {
    console.warn('[EmergencyPopup] 숨김 설정 저장 실패:', e)
  }
}

const visiblePopups = computed(() => popups.value.filter((p) => !closedIds.value.has(p.id)))

const slidesOf = (p) => (Array.isArray(p.slides) ? p.slides.filter((s) => s && s.url) : [])
const isRolling = (p) => p.is_rolling === true && slidesOf(p).length > 1
const currentSlide = (p) => slideIndex.value[p.id] || 0

// javascript: 등 위험 스킴 차단 — http(s) 또는 사이트 내부 경로("/")만 허용
const safeLink = (link) => {
  const v = (link || '').trim()
  if (/^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v)) return v
  return ''
}

const youtubeId = (raw) => {
  const v = (raw || '').trim()
  const m = v.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{11}$/.test(v) ? v : ''
}
const youtubeEmbed = (raw) => {
  const id = youtubeId(raw)
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: id,
    controls: '1',
    playsinline: '1',
    rel: '0'
  })
  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

// 크기/위치: width_px·height_px + position_preset + offset_x/offset_y(+는 오른쪽/아래)
const BASE_POS = {
  center: { css: { top: '50%', left: '50%' }, tx: '-50%', ty: '-50%' },
  'top-center': { css: { top: '16px', left: '50%' }, tx: '-50%', ty: '0px' },
  'bottom-center': { css: { bottom: '16px', left: '50%' }, tx: '-50%', ty: '0px' },
  'top-left': { css: { top: '16px', left: '16px' }, tx: '0px', ty: '0px' },
  'top-right': { css: { top: '16px', right: '16px' }, tx: '0px', ty: '0px' },
  'bottom-left': { css: { bottom: '16px', left: '16px' }, tx: '0px', ty: '0px' },
  'bottom-right': { css: { bottom: '16px', right: '16px' }, tx: '0px', ty: '0px' }
}
const BAR_HEIGHT = 36 // 하단 바 높이(px)
const BORDER_PX = 2 // 컨테이너 border(위아래/좌우 1px씩)
const VIEWPORT_MARGIN = 24 // 뷰포트 가장자리 여백 합계

// 미디어 영역(이미지/영상) 크기: width_px × height_px (영상은 비율로 계산). 하단 바(36px)는 그 아래에 별도로 붙음
const mediaSize = (p) => {
  const w = Number(p.width_px) || 400
  const h =
    p.media_type === 'video_youtube'
      ? Math.round(p.video_aspect_ratio === '16:9' ? (w * 9) / 16 : (w * 16) / 9)
      : Number(p.height_px) || 500
  return { w, h }
}

// 미디어 영역은 항상 설정한 가로:세로 비율 유지 (뷰포트가 작으면 비율 그대로 축소)
const mediaStyle = (p) => {
  const { w, h } = mediaSize(p)
  return { aspectRatio: `${w} / ${h}` }
}

const popupStyle = (p, idx) => {
  const base = BASE_POS[p.position_preset] || BASE_POS.center
  const { w, h } = mediaSize(p)
  // 가로 상한 3개 중 가장 작은 값이 적용되고, 세로는 auto(= 가로 × 비율 + 하단 바).
  //  1) 설정 가로  2) 뷰포트 가로 - 여백  3) 세로가 뷰포트에 들어오도록 역산한 가로 → 가로/세로에 같은 배율이 적용됨
  const fitHeightWidth = `calc((100vh - ${VIEWPORT_MARGIN + BAR_HEIGHT + BORDER_PX}px) * ${w} / ${h} + ${BORDER_PX}px)`
  return {
    ...base.css,
    width: `min(${w}px, calc(100vw - ${VIEWPORT_MARGIN}px), ${fitHeightWidth})`,
    transform: `translate(calc(${base.tx} + ${Number(p.offset_x) || 0}px), calc(${base.ty} + ${Number(p.offset_y) || 0}px))`,
    zIndex: 9000 + idx
  }
}

const closePopup = (p) => {
  closedIds.value = new Set([...closedIds.value, p.id])
}
const hideToday = (p) => {
  const midnight = new Date()
  midnight.setHours(24, 0, 0, 0) // 오늘 자정 = 다음 날 00:00 (로컬)
  saveHideUntil(p, midnight.getTime())
  closePopup(p)
}
const hideUntilEnd = (p) => {
  saveHideUntil(p, new Date(p.end_date).getTime())
  closePopup(p)
}

const startRolling = () => {
  popups.value.filter(isRolling).forEach((p) => {
    const interval = Math.max(1000, Number(p.rolling_interval_ms) || 4000)
    const timer = setInterval(() => {
      const len = slidesOf(p).length
      slideIndex.value = { ...slideIndex.value, [p.id]: ((slideIndex.value[p.id] || 0) + 1) % len }
    }, interval)
    rollingTimers.push(timer)
  })
}

const loadPopups = async () => {
  if (!isSupabaseConfigured()) return
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('popups')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', nowIso)
    .gte('end_date', nowIso)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[EmergencyPopup] popups 조회 실패:', error)
    return
  }
  ;(data || []).forEach((p) => {
    if (p.media_type === 'video_youtube' && !youtubeId(p.youtube_url)) {
      console.warn('[EmergencyPopup] 유튜브 영상 ID를 추출하지 못했습니다. popup id =', p.id, 'youtube_url =', p.youtube_url)
    }
  })
  popups.value = (data || []).filter((p) => !isHidden(p.id))
  startRolling()
}

onMounted(loadPopups)
onUnmounted(() => {
  rollingTimers.forEach(clearInterval)
  rollingTimers = []
})
</script>
