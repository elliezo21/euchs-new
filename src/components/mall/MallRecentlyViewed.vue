<template>
  <!-- 최근 본 상품 섹션 (로그인 사용자만) -->
  <section v-if="isLoggedIn && items.length > 0" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <!-- 헤더 -->
    <div class="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
      <div>
        <h2 class="text-sm sm:text-base font-black text-gray-900">👁 최근 본 상품</h2>
        <p class="text-[11px] text-gray-500 mt-0.5 font-medium">최근 열람한 1688 상품 · 최대 12개</p>
      </div>
      <button type="button" @click="clearAll"
        class="text-[10px] text-gray-400 hover:text-rose-500 font-bold transition cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50">
        전체 삭제
      </button>
    </div>

    <!-- 상품 카드 그리드 -->
    <div class="p-3 sm:p-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
        <div
          v-for="rv in items"
          :key="rv.item_id"
          @click="$emit('open', rv.item_data)"
          class="group bg-white rounded-xl border border-gray-200 hover:border-orange-400 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
        >
          <!-- 썸네일 -->
          <div class="relative aspect-square bg-gray-100 overflow-hidden">
            <img
              :src="rv.item_data?.imageUrl || rv.item_data?.pic_url || rv.item_data?.img || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80'"
              :alt="rv.item_data?.titleKo || rv.item_data?.title || '최근 본 상품'"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="handleImgError"
            />
            <div class="absolute top-1.5 left-1.5">
              <span class="px-1.5 py-0.5 rounded bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black">1688</span>
            </div>
          </div>
          <!-- 카드 정보 -->
          <div class="p-2 space-y-1">
            <p class="text-[10px] sm:text-[11px] font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-orange-600 transition">
              {{ rv.item_data?.titleKo || rv.item_data?.title || '상품명 없음' }}
            </p>
            <div class="flex items-baseline gap-1 font-mono">
              <span class="text-red-600 font-bold text-xs">¥{{ rv.item_data?.priceFormatted || rv.item_data?.price || '–' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { isLoggedIn, currentUser } from '../../lib/auth'
import { translateText } from '../../services/api1688'

const emit = defineEmits(['open'])

const items = ref([])

const HANGUL_RE = /[가-힣]/

/**
 * 표시 시점에만 한글 없는 제목을 배치 번역한다.
 *
 * recently_viewed.item_data는 조회 시점 스냅샷이므로 DB에 되쓰지 않는다.
 * (모달을 연 경로에 따라 titleKo가 중국어로 저장되는 케이스가 있어, 쓰기 경로를
 *  일일이 고치는 대신 표시 시점에 교정한다. 과거에 쌓인 행도 같이 살아난다.)
 *
 * 대상은 화면에 실제로 보이는 12건이 상한이라 1회 배치로 끝난다.
 * translateText는 실패 시 원문을 그대로 돌려주므로, 원문과 같으면 덮지 않고
 * 다음 진입 때 재시도되게 둔다.
 */
async function applyKoreanTitles() {
  const targets = items.value.filter(rv => {
    const ko = rv.item_data?.titleKo || ''
    return !HANGUL_RE.test(ko) && (rv.item_data?.title || '')
  })
  if (targets.length === 0) return

  try {
    const translated = await translateText(targets.map(rv => rv.item_data.title), 'KO')
    const list = Array.isArray(translated) ? translated : [translated]
    targets.forEach((rv, i) => {
      const ko = list[i]
      if (ko && ko !== rv.item_data.title) rv.item_data.titleKo = ko
    })
  } catch (e) {
    // 번역 실패는 화면을 막지 않는다 — 제목이 원문(중국어)으로 남을 뿐이다.
    console.warn('[RecentlyViewed] 제목 번역 실패 (원문 유지):', e?.message || e)
  }
}

// 최근 본 상품 12개 로드
async function loadRecentlyViewed() {
  if (!isLoggedIn.value || !currentUser.value?.id) {
    items.value = []
    return
  }
  try {
    const { data, error } = await supabase
      .from('recently_viewed')
      .select('item_id, item_data, viewed_at')
      .eq('user_id', currentUser.value.id)
      .order('viewed_at', { ascending: false })
      .limit(12)

    if (!error && Array.isArray(data)) {
      items.value = data
      // await 하지 않는다 — 원문으로 먼저 렌더하고 번역 완료 시 제목만 교체된다.
      // (items가 ref이고 rv.item_data를 직접 변경하므로 Vue 반응성으로 자동 갱신)
      applyKoreanTitles()
    }
  } catch (e) {
    console.error('[RecentlyViewed] 로드 실패 (code:', e?.code, '):', e?.message || e)
  }
}

// 전체 삭제
async function clearAll() {
  if (!currentUser.value?.id) return
  try {
    await supabase
      .from('recently_viewed')
      .delete()
      .eq('user_id', currentUser.value.id)
    items.value = []
  } catch (e) {
    console.warn('[RecentlyViewed] 삭제 실패:', e)
  }
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80'
}

// 외부에서 새 항목 기록 후 새로고침 할 수 있도록 expose
function reload() { loadRecentlyViewed() }
defineExpose({ reload })

watch(isLoggedIn, (v) => { if (v) loadRecentlyViewed() })
onMounted(loadRecentlyViewed)
</script>
