<template>
  <div class="space-y-4">

    <!-- 로딩 스켈레톤 (찜 탭과 동일 구성) -->
    <div v-if="isLoading" class="product-card-grid">
      <div v-for="n in 8" :key="n" class="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
        <div class="aspect-square bg-gray-200"></div>
        <div class="p-2 space-y-2">
          <div class="h-3 bg-gray-200 rounded w-4/5"></div>
          <div class="h-3 bg-gray-100 rounded w-1/2"></div>
          <div class="h-6 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    </div>

    <!-- 관리자 세션 안내 (Supabase Auth 세션이 없어 RLS상 조회 불가) -->
    <div v-else-if="isBlocked" class="bg-white border border-amber-200 rounded-2xl shadow-xs py-20 text-center">
      <div class="text-5xl mb-4">🔒</div>
      <p class="text-sm font-bold text-amber-700 mb-2 px-6 leading-relaxed">
        {{ ADMIN_SESSION_MESSAGE }}
      </p>
      <p class="text-xs text-gray-400">관리자 로그인 상태에서는 주문한 상품이 조회되지 않습니다.</p>
    </div>

    <!-- 에러 상태 (원인 문장 그대로 노출 + 재시도) -->
    <div v-else-if="errorMessage" class="bg-white border border-red-200 rounded-2xl shadow-xs py-16 text-center">
      <div class="text-4xl mb-3">⚠️</div>
      <p class="text-sm font-bold text-red-600 mb-2 px-6 leading-relaxed">주문 이력을 불러오지 못했습니다</p>
      <p class="text-xs text-gray-500 mb-5 px-6 break-keep">{{ errorMessage }}</p>
      <button
        type="button"
        :disabled="isLoading"
        @click="load()"
        class="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white font-extrabold text-xs transition cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
      >다시 시도</button>
    </div>

    <!-- 빈 상태 -->
    <div v-else-if="items.length === 0" class="bg-white border border-gray-200 rounded-2xl shadow-xs py-20 text-center">
      <div class="text-5xl mb-4">📦</div>
      <p class="text-sm font-bold text-gray-400 mb-2">아직 주문한 상품이 없어요</p>
      <p class="text-xs text-gray-400">결제가 확인된 주문부터 여기에 모입니다.</p>
      <router-link
        to="/dashboard/orders"
        class="inline-block mt-5 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition cursor-pointer shadow-sm"
      >📋 발주관리 가기</router-link>
    </div>

    <!-- 목록 -->
    <template v-else>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-gray-500 font-medium">
          결제가 확인된 주문 기준 · 많이 주문한 순
        </span>
        <span class="text-xs text-gray-400 ml-auto font-mono tabular-nums">{{ items.length }}개 표시</span>
      </div>

      <!-- 카드 그리드 (style.css의 .product-card-grid — 찜한 상품 탭과 동일 기준) -->
      <div class="product-card-grid">
        <div
          v-for="entry in items"
          :key="entry.itemId"
          class="relative bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
        >
          <!-- 썸네일 -->
          <div class="relative aspect-square bg-gray-100 overflow-hidden cursor-pointer group" @click="emitOpen(entry)">
            <img
              :src="entry.imageUrl || FALLBACK_IMG"
              :alt="entry.title || '주문한 상품'"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="handleImgError"
            />
            <!-- 순위 배지 -->
            <span class="absolute top-1 left-1 min-w-[20px] h-5 px-1 rounded-md bg-gray-900/85 text-white text-[10px] font-black font-mono tabular-nums flex items-center justify-center">
              {{ entry.rank }}
            </span>
            <!-- ★ 찜 배지 (읽기 전용 — 클릭해도 토글되지 않음) -->
            <span
              v-if="savedItemIds.has(entry.itemId)"
              class="absolute top-1 right-1 w-5 h-5 rounded-md bg-white/90 border border-amber-200 text-amber-500 text-[10px] flex items-center justify-center pointer-events-none"
              title="내상품리스트에 찜해둔 상품입니다"
            >★</span>
          </div>

          <!-- 카드 본문 -->
          <div class="p-2 space-y-1 flex-1 flex flex-col">
            <h3
              class="text-[11px] font-medium text-gray-800 leading-snug line-clamp-2 min-h-[30px]"
              :title="entry.title"
            >{{ entry.title || '이름 없는 상품' }}</h3>

            <!-- 주문 횟수 / 마지막 주문일 -->
            <div class="flex flex-wrap items-center gap-1">
              <span class="px-1 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-black whitespace-nowrap">
                주문 {{ entry.orderCount }}회
              </span>
              <span class="text-[10px] text-gray-400 font-mono tabular-nums whitespace-nowrap">
                마지막 {{ formatDate(entry.lastOrderedAt) }}
              </span>
            </div>

            <!-- 주문 당시 단가 -->
            <div class="pt-1 border-t border-gray-100">
              <div class="flex items-baseline gap-1 font-mono tabular-nums whitespace-nowrap">
                <span class="text-red-600 font-bold text-[13px]">¥{{ formatCny(entry.lastUnitPrice) }}</span>
                <span class="text-gray-400 text-[10px]">₩{{ formatNumber(krwFromCny(Number(entry.lastUnitPrice) || 0, props.exchangeRate)) }}</span>
              </div>
              <p class="text-[9px] text-gray-400 font-bold whitespace-nowrap">
                주문 당시 단가<span v-if="entry.lastUnitPriceVaries"> · 옵션별 상이</span>
              </p>
            </div>

            <!-- 다시 담기 (상세모달의 기존 옵션·장바구니 로직을 그대로 사용) -->
            <div class="pt-0.5 mt-auto">
              <button
                type="button"
                @click="emitOpen(entry)"
                class="w-full px-1 py-1.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] transition cursor-pointer active:scale-95 whitespace-nowrap"
                title="옵션을 선택해 장바구니에 담습니다"
              >🔄 다시 담기</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { krwFromCny } from '@/utils/orderCostCalculator'
import { listSavedProducts } from '@/lib/savedProducts'
import { fetchOrderedProducts, ADMIN_SESSION_MESSAGE } from '@/lib/orderedProducts'
import { translateText } from '@/services/api1688'

const props = defineProps({
  exchangeRate: { type: Number, default: 200.0 },
})

// 부모(SourcingProductsView)의 openDetailModal을 그대로 호출할 수 있도록
// saved_products 행과 동일한 형태로 올려보낸다.
const emit = defineEmits(['open-detail'])

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80'
const HANGUL_RE = /[가-힣]/

const items = ref([])
const savedItemIds = ref(new Set())
const isLoading = ref(false)
const isBlocked = ref(false)
const errorMessage = ref('')

/**
 * 표시 시점에만 한글 없는 제목을 배치 번역한다.
 * (MallRecentlyViewed.applyKoreanTitles와 동일한 방식 — DB에 되쓰지 않는다)
 *
 * orders.items[].titleKo는 주문 시점 스냅샷이라 번역 킬스위치가 꺼져 있던 기간의
 * 주문에는 중국어가 그대로 들어있다. translateText는 킬스위치가 꺼져 있으면
 * 원문을 그대로 돌려주므로, 원문과 같으면 덮지 않고 다음 진입 때 재시도되게 둔다.
 */
async function applyKoreanTitles(list) {
  const targets = list.filter((e) => e.title && !HANGUL_RE.test(e.title))
  if (targets.length === 0) return

  try {
    const translated = await translateText(targets.map((e) => e.title), 'KO')
    const result = Array.isArray(translated) ? translated : [translated]
    targets.forEach((e, i) => {
      const ko = result[i]
      if (ko && ko !== e.title) e.title = ko
    })
  } catch (err) {
    // 번역 실패는 화면을 막지 않는다 — 제목이 원문(중국어)으로 남을 뿐이다.
    console.error('[주문한상품] 제목 번역 실패 (원문 유지):', err?.message || err)
  }
}

/** ★ 배지용 찜 itemId 집합 — savedProducts의 기존 조회 함수를 그대로 사용한다. */
async function loadSavedIds() {
  try {
    const rows = await listSavedProducts()
    savedItemIds.value = new Set(rows.map((r) => String(r.item_id)))
  } catch (err) {
    // 찜 배지는 부가 정보이므로 목록 자체를 막지 않는다. 실패 시 배지만 빠진다.
    console.error('[주문한상품] 찜 목록 조회 실패 (★ 배지 생략):', err?.message || err)
    savedItemIds.value = new Set()
  }
}

async function load() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { blocked, items: list } = await fetchOrderedProducts()
    isBlocked.value = blocked
    if (blocked) {
      items.value = []
      savedItemIds.value = new Set()
      return
    }
    items.value = list
    // await 하지 않는다 — 원문으로 먼저 렌더하고 완료 시 제목만 교체된다.
    applyKoreanTitles(items.value)
    loadSavedIds()
  } catch (err) {
    console.error('[주문한상품] 로드 실패:', err)
    items.value = []
    errorMessage.value = err?.message || String(err)
  } finally {
    isLoading.value = false
  }
}

function emitOpen(entry) {
  emit('open-detail', {
    item_id: entry.itemId,
    item_data: { productUrl: entry.productUrl },
    display_name: entry.title,
    title_zh: '',
    image_url: entry.imageUrl,
    snapshot_price: entry.lastUnitPrice,
  })
}

function formatNumber(num) {
  return Math.round(Number(num) || 0).toLocaleString('ko-KR')
}
function formatCny(val) {
  const n = Number(val)
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '–'
}
function formatDate(iso) {
  if (!iso) return '–'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '–'
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
function handleImgError(e) {
  e.target.src = FALLBACK_IMG
}

// ─── Auth 상태 변경 핸들러 — 로그아웃 시 개인 데이터 즉시 초기화 ─────
// DashboardView.onAuthChanged / OrderManageView.onAuthChanged와 동일 패턴.
// 부모가 로그아웃 시 이 패널을 언마운트하지만, 계정 전환(로그아웃 없는 재로그인)
// 중에도 이전 계정 데이터가 남지 않도록 패널 자체가 따로 구독한다.
function onAuthChanged(e) {
  if (!e.detail?.user) {
    // 로그아웃: 주문한 상품 목록·찜 배지·에러 상태 즉시 비우기
    items.value = []
    savedItemIds.value = new Set()
    errorMessage.value = ''
    isBlocked.value = false
  } else {
    // 로그인 또는 계정 전환: 해당 계정 데이터 재로드
    load()
  }
}

// 부모가 "주문한 상품" 탭을 처음 열 때만 이 컴포넌트를 마운트한다(v-if).
// 이후 탭 전환은 v-show로 처리되므로 재조회가 일어나지 않는다.
onMounted(() => {
  load()
  window.addEventListener('euchs-auth-changed', onAuthChanged)
})
onUnmounted(() => {
  window.removeEventListener('euchs-auth-changed', onAuthChanged)
})
</script>
