<template>
  <div class="min-h-full bg-slate-50 font-sans">

    <!-- ===================================================== -->
    <!-- 상단 헤더 & 필터 바                                      -->
    <!-- ===================================================== -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
      <div class="px-4 sm:px-6 lg:px-8 py-4">

        <!-- 타이틀 행 -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div class="flex items-center gap-2.5 mb-1">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                <i class="fas fa-store-alt text-white text-sm"></i>
              </div>
              <h1 class="text-xl font-extrabold text-gray-900 tracking-tight">구매 &amp; 관심 상점 모음</h1>
            </div>
            <p class="text-xs text-gray-500 leading-relaxed ml-10.5">
              이전에 발주를 진행했던 1688 공장 및 즐겨찾기한 상점 목록입니다. 상점별 대표 상품 확인 및 재발주를 간편하게 진행하세요.
            </p>
          </div>

          <!-- 소싱몰 바로가기 버튼 -->
          <button
            type="button"
            @click="goToMall"
            class="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <i class="fas fa-search"></i>
            <span>1688 소싱몰 상품 탐색</span>
          </button>
        </div>

        <!-- 탭 필터 -->
        <div class="flex gap-1.5 mt-4 flex-wrap">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            @click="activeTab = tab.id"
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer"
            :class="activeTab === tab.id
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          >
            <i :class="tab.icon" class="text-[11px]"></i>
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.count > 0"
              class="px-1.5 py-0.5 rounded-full text-[9px] font-black"
              :class="activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-gray-300 text-gray-700'"
            >{{ tab.count }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ===================================================== -->
    <!-- 메인 콘텐츠                                             -->
    <!-- ===================================================== -->
    <div class="px-4 sm:px-6 lg:px-8 py-6">

      <!-- 로딩 상태 -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-24 gap-4">
        <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-gray-500 font-medium">상점 데이터를 불러오는 중...</p>
      </div>

      <!-- 상점 카드 그리드 -->
      <div
        v-else-if="filteredStores.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
      >
        <div
          v-for="store in filteredStores"
          :key="store.id"
          class="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
        >
          <!-- 카드 헤더: 상점명 & 뱃지 -->
          <div class="px-5 pt-5 pb-3 border-b border-gray-100">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <!-- 유형 뱃지 -->
                <div class="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span
                    v-if="store.type === 'purchased'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100"
                  >
                    <i class="fas fa-shopping-bag text-[9px]"></i>구매 이력
                  </span>
                  <span
                    v-if="store.type === 'favorite'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100"
                  >
                    <i class="fas fa-heart text-[9px]"></i>관심 찜
                  </span>
                  <span
                    v-if="store.type === 'both'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200"
                  >
                    <i class="fas fa-star text-[9px]"></i>구매 + 찜
                  </span>
                </div>

                <!-- 상점명 -->
                <h3 class="text-sm font-extrabold text-gray-900 leading-snug truncate" :title="store.shopName">
                  {{ store.shopName || '1688 공급처 상점' }}
                </h3>
                <p v-if="store.shopNameKo" class="text-xs text-gray-500 mt-0.5 truncate">{{ store.shopNameKo }}</p>
              </div>

              <!-- 즐겨찾기 별 버튼 -->
              <button
                type="button"
                @click="toggleFavorite(store)"
                class="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition cursor-pointer"
                :class="store.isFavorited ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-amber-400'"
                :title="store.isFavorited ? '찜 해제' : '찜 등록'"
              >
                <i :class="store.isFavorited ? 'fas fa-star' : 'far fa-star'" class="text-sm"></i>
              </button>
            </div>

            <!-- 신용 뱃지들 -->
            <div class="flex items-center gap-1.5 mt-2.5 flex-wrap">
              <span
                v-for="badge in store.badges"
                :key="badge"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100"
              >
                <i class="fas fa-check-circle text-[9px]"></i>{{ badge }}
              </span>
            </div>
          </div>

          <!-- 대표 상품 썸네일 미리보기 (최대 4개) -->
          <div class="px-4 py-3 bg-gray-50/50">
            <p class="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">대표 상품</p>
            <div v-if="store.thumbnails.length > 0" class="flex gap-2 overflow-hidden">
              <div
                v-for="(thumb, idx) in store.thumbnails.slice(0, 4)"
                :key="idx"
                class="w-14 h-14 rounded-lg overflow-hidden bg-gray-200 shrink-0 border border-gray-200"
              >
                <img
                  :src="thumb"
                  :alt="`상품 ${idx + 1}`"
                  class="w-full h-full object-cover"
                  @error="handleImgError($event)"
                />
              </div>
              <div
                v-if="store.thumbnails.length > 4"
                class="w-14 h-14 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center border border-gray-200"
              >
                <span class="text-xs font-bold text-gray-500">+{{ store.thumbnails.length - 4 }}</span>
              </div>
            </div>
            <div v-else class="flex items-center gap-2 py-2">
              <div class="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center">
                <i class="fas fa-image text-gray-400 text-lg"></i>
              </div>
              <p class="text-xs text-gray-400">상품 이미지 없음</p>
            </div>
          </div>

          <!-- 누적 구매 통계 -->
          <div class="px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-4">
            <div class="text-center">
              <p class="text-[10px] text-gray-400 font-medium">발주 이력</p>
              <p class="text-base font-black text-blue-600">{{ store.orderCount }}<span class="text-[10px] font-normal text-gray-500 ml-0.5">회</span></p>
            </div>
            <div class="w-px h-8 bg-gray-200"></div>
            <div class="text-center">
              <p class="text-[10px] text-gray-400 font-medium">총 발주 수량</p>
              <p class="text-base font-black text-gray-800">{{ store.totalQuantity.toLocaleString() }}<span class="text-[10px] font-normal text-gray-500 ml-0.5">개</span></p>
            </div>
            <div class="w-px h-8 bg-gray-200"></div>
            <div class="text-center">
              <p class="text-[10px] text-gray-400 font-medium">총 발주액</p>
              <p class="text-base font-black text-emerald-600">{{ formatKrw(store.totalAmountKrw) }}</p>
            </div>
          </div>

          <!-- 액션 버튼 -->
          <div class="px-4 pb-4 pt-3 flex gap-2 mt-auto">
            <button
              type="button"
              @click="goToStoreSearch(store)"
              class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
            >
              <i class="fas fa-search text-[10px]"></i>
              <span>이 상점 상품 모아보기</span>
            </button>
            <button
              type="button"
              @click="removeStore(store)"
              class="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-gray-200 hover:border-red-200 text-gray-500 hover:text-red-500 hover:bg-red-50 text-xs font-bold transition active:scale-95 cursor-pointer"
              :title="store.type === 'purchased' ? '구매 이력 상점은 숨김 처리됩니다' : '단골 상점 해제'"
            >
              <i class="fas fa-trash-alt text-[10px]"></i>
              <span>{{ store.type === 'purchased' ? '숨기기' : '해제' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div class="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
          <i class="fas fa-store-slash text-4xl text-gray-300"></i>
        </div>
        <div>
          <p class="text-lg font-extrabold text-gray-700 mb-1">아직 등록된 상점이 없습니다</p>
          <p class="text-sm text-gray-400 leading-relaxed max-w-xs">
            1688 소싱몰에서 상품을 발주하거나,<br/>
            상점을 찜(즐겨찾기)하면 이곳에 자동으로 모입니다.
          </p>
        </div>
        <div class="flex gap-3 flex-wrap justify-center">
          <button
            type="button"
            @click="goToMall"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <i class="fas fa-store"></i>
            <span>1688 소싱몰 바로가기</span>
          </button>
          <button
            type="button"
            @click="addDemoFavorite"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 hover:border-amber-400 text-gray-600 hover:text-amber-600 text-sm font-bold transition active:scale-95 cursor-pointer"
          >
            <i class="fas fa-plus"></i>
            <span>샘플 상점 추가 (테스트)</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getStoredOrders } from '../../utils/orderStorage'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const LS_FAVORITE_KEY = 'euchs_favorite_stores'
const LS_HIDDEN_KEY   = 'euchs_hidden_purchased_stores'

const SAMPLE_BADGES = ['슈퍼팩토리', '재구매율 90% 이상', '품질 검증 공장', '이우 현지 직영', '빠른 납기']

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
const router    = useRouter()
const isLoading = ref(true)
const activeTab = ref('all')

const purchasedStores = ref([])
const favoriteStores  = ref([])
const hiddenIds       = ref(new Set())

// ─────────────────────────────────────────────
// 탭 정의
// ─────────────────────────────────────────────
const tabs = computed(() => [
  { id: 'all',       label: '전체 상점',        icon: 'fas fa-th-large',     count: allStores.value.length },
  { id: 'purchased', label: '실제 구매 이력 공장', icon: 'fas fa-shopping-bag', count: purchasedStores.value.filter(s => !hiddenIds.value.has(s.id)).length },
  { id: 'favorite',  label: '관심 찜 상점',      icon: 'fas fa-heart',        count: favoriteStores.value.length },
])

// ─────────────────────────────────────────────
// 데이터 통합 & 필터
// ─────────────────────────────────────────────
const favoritedIds = computed(() => new Set(favoriteStores.value.map(s => s.id)))

const allStores = computed(() => {
  const map = new Map()

  purchasedStores.value.forEach(s => {
    if (hiddenIds.value.has(s.id)) return
    const isFav = favoritedIds.value.has(s.id)
    map.set(s.id, { ...s, type: isFav ? 'both' : 'purchased', isFavorited: isFav })
  })

  favoriteStores.value.forEach(s => {
    if (!map.has(s.id)) {
      map.set(s.id, { ...s, type: 'favorite', isFavorited: true })
    }
  })

  return Array.from(map.values())
})

const filteredStores = computed(() => {
  if (activeTab.value === 'all') return allStores.value
  if (activeTab.value === 'purchased') return allStores.value.filter(s => s.type === 'purchased' || s.type === 'both')
  if (activeTab.value === 'favorite')  return allStores.value.filter(s => s.type === 'favorite'  || s.type === 'both')
  return allStores.value
})

// ─────────────────────────────────────────────
// 주문 데이터 → 상점 그룹핑
// ─────────────────────────────────────────────
function buildPurchasedStores(orders) {
  const storeMap = new Map()

  orders.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : []
    items.forEach(item => {
      const shopId   = item.shopId   || item.supplierId  || item.storeId   || null
      const shopName = item.shopName || item.supplierName || item.storeName || item.shop || null
      const shopUrl  = item.shopUrl  || item.supplierUrl || item.storeUrl  || null

      if (!shopId && !shopName) return

      const key = shopId || shopName
      if (!storeMap.has(key)) {
        storeMap.set(key, {
          id:             key,
          shopId:         shopId || key,
          shopName:       shopName || shopId || '1688 공급처',
          shopNameKo:     item.shopNameKo || item.storeNameKo || '',
          shopUrl:        shopUrl || (shopId ? `https://shop.1688.com/shop/ent_shop.htm?_col=1&memberId=${shopId}` : ''),
          orderCount:     0,
          totalQuantity:  0,
          totalAmountKrw: 0,
          thumbnails:     [],
          badges:         _assignBadges(shopId || shopName),
        })
      }

      const entry = storeMap.get(key)
      entry.orderCount    += 1
      entry.totalQuantity += Number(item.quantity) || 0
      entry.totalAmountKrw += Number(item.totalPriceKrw || item.priceKrw || 0)

      const thumb = item.imageUrl || item.thumbnail || item.image || ''
      if (thumb && entry.thumbnails.length < 8) {
        entry.thumbnails.push(thumb)
      }
    })
  })

  return Array.from(storeMap.values()).sort((a, b) => b.orderCount - a.orderCount)
}

function _assignBadges(seed) {
  const hash  = String(seed).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const count = (hash % 2) + 1
  const start = hash % SAMPLE_BADGES.length
  return Array.from({ length: count }, (_, i) => SAMPLE_BADGES[(start + i) % SAMPLE_BADGES.length])
}

// ─────────────────────────────────────────────
// 로컬스토리지 연동
// ─────────────────────────────────────────────
function loadFavoriteStores() {
  try {
    const raw = localStorage.getItem(LS_FAVORITE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function saveFavoriteStores(stores) {
  try { localStorage.setItem(LS_FAVORITE_KEY, JSON.stringify(stores)) } catch { /* 무시 */ }
}

function loadHiddenIds() {
  try {
    const raw = localStorage.getItem(LS_HIDDEN_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch { return new Set() }
}

function saveHiddenIds(set) {
  try { localStorage.setItem(LS_HIDDEN_KEY, JSON.stringify([...set])) } catch { /* 무시 */ }
}

// ─────────────────────────────────────────────
// 액션 핸들러
// ─────────────────────────────────────────────
function toggleFavorite(store) {
  const favs = [...favoriteStores.value]
  const idx  = favs.findIndex(s => s.id === store.id)
  if (idx >= 0) {
    favs.splice(idx, 1)
  } else {
    favs.unshift({
      id:             store.id,
      shopId:         store.shopId,
      shopName:       store.shopName,
      shopNameKo:     store.shopNameKo || '',
      shopUrl:        store.shopUrl || '',
      orderCount:     store.orderCount || 0,
      totalQuantity:  store.totalQuantity || 0,
      totalAmountKrw: store.totalAmountKrw || 0,
      thumbnails:     store.thumbnails || [],
      badges:         store.badges || [],
    })
  }
  favoriteStores.value = favs
  saveFavoriteStores(favs)
}

function removeStore(store) {
  if (store.type === 'purchased' || store.type === 'both') {
    hiddenIds.value.add(store.id)
    saveHiddenIds(hiddenIds.value)
    favoriteStores.value = favoriteStores.value.filter(s => s.id !== store.id)
    saveFavoriteStores(favoriteStores.value)
  } else {
    favoriteStores.value = favoriteStores.value.filter(s => s.id !== store.id)
    saveFavoriteStores(favoriteStores.value)
  }
}

function goToStoreSearch(store) {
  const keyword = store.shopName || store.shopId || ''
  router.push({ path: '/mall', query: { search: keyword } })
}

function goToMall() {
  router.push('/mall')
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1560472355-536de3962603?w=160&auto=format&fit=crop&q=60'
}

function formatKrw(amount) {
  if (!amount || amount === 0) return '–'
  if (amount >= 10000) return `${(amount / 10000).toFixed(1)}만원`
  return `${amount.toLocaleString()}원`
}

function addDemoFavorite() {
  const demo = {
    id:             'demo-store-1688',
    shopId:         'demo-store-1688',
    shopName:       '义乌市XX日用品有限公司',
    shopNameKo:     '이우 XX 생활용품 직영 공장',
    shopUrl:        'https://shop.1688.com',
    orderCount:     0,
    totalQuantity:  0,
    totalAmountKrw: 0,
    thumbnails: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=160&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1560472355-536de3962603?w=160&auto=format&fit=crop&q=60',
    ],
    badges: ['슈퍼팩토리', '품질 검증 공장'],
  }
  const favs = [demo, ...favoriteStores.value.filter(s => s.id !== demo.id)]
  favoriteStores.value = favs
  saveFavoriteStores(favs)
}

// ─────────────────────────────────────────────
// 초기화
// ─────────────────────────────────────────────
onMounted(() => {
  try {
    hiddenIds.value       = loadHiddenIds()
    favoriteStores.value  = loadFavoriteStores()
    const orders          = getStoredOrders()
    purchasedStores.value = buildPurchasedStores(orders)
  } catch (e) {
    console.error('[FavoriteStoresView] init error:', e)
  } finally {
    isLoading.value = false
  }
})
</script>
