<template>
  <div 
    v-if="product" 
    class="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fade-in"
    @click.self="handleClose"
  >
    <!-- 1. Modal Container (max-w-7xl) -->
    <div 
      ref="modalContainerRef"
      class="bg-white rounded-3xl max-w-7xl w-full max-h-[88vh] flex flex-col shadow-2xl relative border border-gray-200 overflow-hidden font-sans my-auto"
      @click.stop
    >
      
      <!-- ======================================================== -->
      <!-- 1. MODAL TOP HEADER (Sticky Top) -->
      <!-- ======================================================== -->
      <div class="px-5 py-3.5 sm:px-8 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/90 backdrop-blur-md shrink-0 z-20">
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black tracking-wider shadow-sm flex items-center gap-1.5">
            <i class="fas fa-store text-xs"></i> 1688 실시간 도매 상세
          </span>
          <span class="text-xs text-gray-500 font-mono hidden sm:inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
            <span>상품 ID:</span>
            <b class="text-gray-800">{{ currentItem?.id || product.id }}</b>
          </span>
          <span v-if="currentItem?.company" class="hidden md:inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-semibold">
            <i class="fas fa-building text-[10px]"></i>
            <span class="truncate max-w-[200px]">{{ currentItem.company }}</span>
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button 
            type="button"
            @click="handleClose" 
            class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center text-sm transition focus:outline-none"
            aria-label="모달 닫기"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Toast Alert Notification -->
      <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform -translate-y-4 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-4 opacity-0"
      >
        <div
          v-if="toastMessage"
          class="absolute top-16 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-2.5 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold backdrop-blur-md animate-bounce-subtle"
          :class="toastType === 'warning' ? 'bg-amber-950/95 border-amber-600 text-amber-200' : (toastType === 'info' ? 'bg-blue-950/95 border-blue-600 text-blue-200' : 'bg-slate-900/95 border-slate-700 text-emerald-300')"
        >
          <span
            class="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 shadow-xs"
            :class="toastType === 'warning' ? 'bg-amber-500 text-slate-950' : (toastType === 'info' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')"
          >
            <i :class="toastType === 'warning' ? 'fas fa-exclamation' : (toastType === 'info' ? 'fas fa-info' : 'fas fa-check')"></i>
          </span>
          <span>{{ toastMessage }}</span>
          <button
            v-if="toastLink"
            type="button"
            @click="goToSavedProductList"
            class="ml-1 px-2 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs underline underline-offset-2 transition cursor-pointer"
          >
            보러가기
          </button>
          <button
            type="button"
            @click="toastMessage = ''"
            class="text-gray-400 hover:text-white ml-2 text-xs cursor-pointer"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </transition>

      <!-- ======================================================== -->
      <!-- 2. MODAL BODY (SCROLLABLE CONTAINER: max-h-[88vh]) -->
      <!-- ======================================================== -->
      <div ref="modalBodyRef" class="p-5 sm:p-8 md:p-10 overflow-y-auto flex-1 space-y-10 custom-scrollbar">
        
        <!-- Top Title Section -->
        <div class="space-y-2">
          <!-- 한글 상품 제목: 100% 폭, 줄바꿈 자연스럽게 확보 -->
          <h2 class="w-full text-lg sm:text-xl md:text-2xl font-black text-gray-900 leading-snug break-keep">
            {{ displayProductTitle }}
          </h2>

          <!-- 1688 원문 및 원본 링크 통합 라인 (제목 바로 아래) -->
          <div class="mt-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <!-- 좌측: 중국어 원문 -->
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="shrink-0 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded">1688 원문</span>
              <span class="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md font-mono" :title="currentItem?.subject_trans || currentItem?.titleZh">
                {{ currentItem?.subject_trans || currentItem?.titleZh || currentItem?.title }}
              </span>
            </div>

            <!-- 우측: 1688 원본 링크 버튼 -->
            <a 
              :href="original1688Url" 
              target="_blank" 
              rel="noopener noreferrer"
              class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition active:scale-95 shadow-xs"
              title="1688 공식 상품 페이지 열기"
            >
              <span>1688링크</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- TOP 2-COLUMN SECTION: Gallery & SKU Options -->
        <!-- ======================================================== -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          <!-- LEFT COLUMN: Image Gallery & Badges (5 cols) -->
          <div class="lg:col-span-5 space-y-4">
            <!-- Main Large Image -->
            <div class="relative aspect-square bg-gray-100 rounded-3xl overflow-hidden border border-gray-200 shadow-sm group">
              <img 
                :src="activeImage || currentItem?.imageUrl" 
                :alt="currentItem?.titleKo"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                referrerpolicy="no-referrer"
                @error="handleImageFallback"
              />
              
              <!-- MOQ & 1688 Badges -->
              <div class="absolute top-3 left-3 flex flex-col gap-1.5">
                <span class="px-2.5 py-1 rounded-lg bg-orange-500 text-white text-xs font-black shadow-md">
                  1688 공식 도매
                </span>
                <span class="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-xs font-bold shadow-sm">
                  MOQ {{ currentItem?.minOrder || 1 }}개부터
                </span>
              </div>
            </div>

            <!-- Thumbnail Gallery List -->
            <div v-if="galleryImages.length > 1" class="flex items-center gap-2.5 overflow-x-auto pb-1">
              <button
                v-for="(img, idx) in galleryImages"
                :key="idx"
                type="button"
                @click="activeImage = img"
                class="w-16 h-16 rounded-2xl border-2 overflow-hidden shrink-0 transition-all bg-gray-50"
                :class="activeImage === img ? 'border-rose-600 shadow-md scale-105' : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'"
              >
                <img :src="img" :alt="`thumb-${idx}`" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
              </button>
            </div>

            <!-- Shop & Trust Meta Card -->
            <div class="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-xs space-y-2.5">
              <div class="flex items-center justify-between text-gray-700">
                <span class="text-gray-500 font-medium">공급사 상호 (Seller):</span>
                <span class="font-bold text-gray-900 truncate max-w-[180px]" :title="currentItem?.company || currentItem?.sellerName">
                  {{ currentItem?.company || currentItem?.sellerName || '1688 인증 도매공장' }}
                </span>
              </div>
              <!-- 재구매율: API가 실제 값을 제공할 때만 표시 (가짜 폴백 표시 금지) -->
              <div v-if="currentItem?.repurchaseRate" class="flex items-center justify-between text-gray-700 border-t border-gray-200/60 pt-2">
                <span class="text-gray-500 font-medium">재구매율 / 판매량:</span>
                <span class="font-bold text-gray-900">
                  <b class="text-rose-600">{{ currentItem.repurchaseRate }}</b> (누적 {{ currentItem?.sales || '0' }}건)
                </span>
              </div>
              <!-- 재구매율 없을 때: 판매량만 표시 -->
              <div v-else-if="currentItem?.sales" class="flex items-center justify-between text-gray-700 border-t border-gray-200/60 pt-2">
                <span class="text-gray-500 font-medium">누적 판매량:</span>
                <span class="font-bold text-gray-900">{{ currentItem.sales }}건</span>
              </div>
              <div class="flex items-center justify-between text-gray-700 border-t border-gray-200/60 pt-2">
                <span class="text-gray-500 font-medium">통관/검수 보장:</span>
                <span class="font-bold text-emerald-600 flex items-center gap-1">
                  <i class="fas fa-check-circle text-xs"></i> EUCHS 100% 정밀검수 & 한-중 FTA 지원
                </span>
              </div>

              <!-- 단골상점 찜하기 버튼 (item_search_shop API 미구독으로 임시 비활성화 / 추후 구독 시 복구) -->
              <!--
              <div class="mt-2.5 pt-2 border-t border-slate-200/80">
                <button
                  type="button"
                  @click="toggleFavoriteStore"
                  class="w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs border"
                  :class="isStoreFavorite ? 'bg-amber-50 text-amber-600 border-amber-300 hover:bg-amber-100' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'"
                >
                  <i :class="isStoreFavorite ? 'fas fa-star text-amber-500' : 'far fa-star text-slate-400'"></i>
                  <span>{{ isStoreFavorite ? '단골상점 찜 완료' : '단골상점 찜하기' }}</span>
                </button>
              </div>
              -->
            </div>


          </div>

          <!-- RIGHT COLUMN: Price Tiers, Options, and Item Selection (7 cols) -->
          <div class="lg:col-span-7 space-y-6">
            
            <!-- 1. Tiered Pricing Table (수량별 도매가 티어) -->
            <div class="bg-rose-50/50 rounded-3xl p-4 sm:p-5 border border-rose-100 space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-rose-900 flex items-center gap-1.5 text-sm">
                  <i class="fas fa-tags text-rose-600"></i> {{ isSkuPricedProduct ? '옵션별 실시간 도매 단가' : '수량별 실시간 도매 단가' }}
                </span>
                <span class="text-xs text-gray-500 font-mono">
                  적용 환율: 1 RMB = {{ effectiveExchangeRate }}원
                </span>
              </div>

              <!-- 로딩 중 스켈레톤 (3칸 티어) -->
              <div v-if="isDetailLoading" class="grid grid-cols-3 gap-3 pt-1">
                <div v-for="n in 3" :key="n" class="bg-white rounded-2xl p-3 text-center border border-rose-100/80 shadow-xs animate-pulse space-y-2">
                  <div class="h-3 w-16 bg-slate-200 rounded mx-auto"></div>
                  <div class="h-5 w-20 bg-rose-200/80 rounded mx-auto"></div>
                  <div class="h-3 w-14 bg-slate-100 rounded mx-auto"></div>
                </div>
              </div>

              <!-- Dynamic Tier Grid (로딩 완료 후) -->
              <div 
                v-else
                class="grid gap-3 pt-1"
                :class="displayedPriceTiers.length === 2 ? 'grid-cols-2' : (displayedPriceTiers.length === 1 ? 'grid-cols-1' : 'grid-cols-3')"
              >
                <div 
                  v-for="(tier, tIdx) in displayedPriceTiers"
                  :key="tIdx"
                  class="bg-white rounded-2xl p-3 text-center border transition shadow-sm"
                  :class="!tier.isSkuRange && currentUnitRmb === tier.price ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/20' : 'border-rose-100'"
                >
                  <div class="text-xs text-gray-500 font-medium">{{ tier.label }}</div>
                  <div class="text-base sm:text-lg font-black text-rose-600 font-mono mt-0.5">¥ {{ tier.priceFormatted }}</div>
                  <div class="text-xs text-gray-400 font-mono">약 ₩{{ tier.priceKrwFormatted || formatKrw(tier.priceKrw) }}</div>
                </div>
              </div>
            </div>

            <!-- 2. Option Selection (1차 & 2차): 로딩 중 스켈레톤 / 완료 후 실제 버튼 -->
            <div v-if="isDetailLoading" class="space-y-4 py-1">
              <!-- 1차 옵션 스켈레톤 -->
              <div class="space-y-2.5">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1.5">
                    <div class="h-3.5 w-20 bg-slate-200 rounded animate-pulse"></div>
                    <div class="h-3.5 w-3 bg-rose-200 rounded animate-pulse"></div>
                  </div>
                  <div class="h-3 w-28 bg-slate-100 rounded animate-pulse"></div>
                </div>
                <div class="flex flex-wrap gap-2.5">
                  <div 
                    v-for="n in 4" 
                    :key="n" 
                    class="h-9 px-3.5 rounded-xl border border-gray-200 bg-white shadow-xs animate-pulse flex items-center gap-2"
                  >
                    <div class="w-5 h-5 rounded-full bg-slate-200 shrink-0"></div>
                    <div class="h-3.5 w-12 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </div>
              <!-- 2차 옵션 스켈레톤 -->
              <div class="space-y-2.5 pt-1">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1.5">
                    <div class="h-3.5 w-24 bg-slate-200 rounded animate-pulse"></div>
                    <div class="h-3.5 w-3 bg-rose-200 rounded animate-pulse"></div>
                  </div>
                  <div class="h-3 w-36 bg-slate-100 rounded animate-pulse"></div>
                </div>
                <div class="flex flex-wrap gap-2.5">
                  <div 
                    v-for="n in 5" 
                    :key="n" 
                    class="h-9 w-16 rounded-xl border border-gray-200 bg-white shadow-xs animate-pulse flex items-center justify-center"
                  >
                    <div class="h-3.5 w-8 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>

            <template v-else>
              <!-- 2a. Option Selection: Color / Style (1차 옵션) -->
              <div class="space-y-2.5">
                <div class="flex items-center justify-between text-xs">
                  <label class="font-bold text-gray-800 flex items-center gap-1.5">
                    <span>1차 옵션 ({{ firstPropName }})</span>
                    <span class="text-rose-600 font-bold">*</span>
                  </label>
                  <span v-if="selectedColor" class="text-rose-600 font-bold text-xs bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    선택: {{ selectedColor.name }}
                  </span>
                  <span v-else class="text-gray-400 text-xs">
                    {{ firstPropName }}을(를) 먼저 선택하세요
                  </span>
                </div>
                <!-- 보기 전용: 옵션 목록은 그대로 보이되 선택(발주 품목 추가)만 막는다 -->
                <div class="flex flex-wrap gap-2.5" :class="readonly ? 'pointer-events-none' : ''">
                  <button
                    v-for="(color, cIdx) in colorOptions"
                    :key="color.colorId || cIdx"
                    type="button"
                    @click="handleSelectColor(color)"
                    :disabled="isColorSoldOut(color.name)"
                    class="px-3.5 py-2 rounded-xl border-2 text-xs font-medium transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    :class="isColorSoldOut(color.name)
                      ? 'border-gray-200 bg-white text-gray-400'
                      : (selectedColorId === color.colorId
                        ? 'border-rose-600 bg-rose-500 text-white font-bold shadow-md ring-2 ring-rose-400/50'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700')"
                  >
                    <img v-if="color.imageUrl" :src="color.imageUrl" :alt="color.name" class="w-5 h-5 rounded-full object-cover border border-white/50" referrerpolicy="no-referrer" />
                    <span>{{ color.name }}</span>
                    <span v-if="isColorSoldOut(color.name)" class="text-[10px] text-gray-400 font-normal">품절</span>
                    <i v-if="selectedColorId === color.colorId" class="fas fa-check text-[10px]"></i>
                  </button>
                </div>
              </div>

              <!-- 2b. Option Selection: Size / Spec (2차 옵션 - 다중 옵션일 때만 노출) -->
              <div v-if="sizeOptions && sizeOptions.length > 0" class="space-y-2.5">
                <div class="flex items-center justify-between text-xs">
                  <label class="font-bold text-gray-800 flex items-center gap-1.5">
                    <span>2차 옵션 ({{ secondPropName }})</span>
                    <span class="text-rose-600 font-bold">*</span>
                  </label>
                  <span v-if="!selectedColor" class="text-amber-600 font-medium text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    ⚠️ 1차 {{ firstPropName }}을(를) 먼저 선택해 주세요
                  </span>
                  <span v-else class="text-gray-500 text-xs">
                    {{ secondPropName }}을(를) 누르면 품목에 추가됩니다
                  </span>
                </div>
                <div class="flex flex-wrap gap-2.5" :class="readonly ? 'pointer-events-none' : ''">
                  <button
                    v-for="(size, sIdx) in sizeOptions"
                    :key="sIdx"
                    type="button"
                    @click="handleSelectSize(size)"
                    :disabled="isSizeDisabled(size)"
                    class="px-4 py-2 rounded-xl border-2 text-xs font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex flex-col items-center leading-tight"
                    :class="isSizeDisabled(size)
                      ? 'border-gray-200 bg-white text-gray-400'
                      : (selectedSize === size
                        ? 'border-rose-600 bg-rose-500 text-white font-bold shadow-md ring-2 ring-rose-400/50'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700')"
                  >
                    <span>{{ size }}</span>
                    <span v-if="sizeStockMap[size] === 0 || sizeStockMap[size] === undefined" class="text-[10px] text-gray-400 font-normal">품절</span>
                    <span v-else-if="typeof sizeStockMap[size] === 'number'" :class="selectedSize === size ? 'text-[10px] text-rose-200 font-normal' : 'text-[10px] text-gray-400 font-normal'">재고 {{ sizeStockMap[size] }}</span>
                  </button>
                </div>
              </div>
            </template>

            <!-- 4. Selected SKUs List & Quantity Adjuster (보기 전용에서는 숨김) -->
            <div v-if="!readonly" class="space-y-2.5 pt-2 border-t border-gray-100">
              <div class="flex items-center justify-between text-xs font-bold text-gray-800">
                <span class="flex items-center gap-1.5">
                  <span>선택된 발주 품목</span>
                  <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-mono font-black">
                    {{ selectedSkus.length }}개
                  </span>
                </span>
                <span class="text-gray-400 font-normal text-xs">
                  {{ selectedSkus.length > 0 ? '수량을 조절하세요' : '옵션을 선택하면 아래에 등록됩니다' }}
                </span>
              </div>

              <!-- SKU Items Box -->
              <div class="space-y-2.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                <div
                  v-for="(sku, skuIdx) in selectedSkus"
                  :key="skuIdx"
                  class="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-gray-900 truncate text-sm">
                      {{ [sku.color, sku.size].filter(p => p && p !== '-' && p !== 'undefined').join(' / ') || '기본 단품' }}
                    </div>
                    <div class="text-xs text-rose-600 font-mono mt-0.5 font-bold">
                      개당 ¥{{ rowUnitPrice(sku).toFixed(2) }} (약 ₩{{ formatKrw(rowUnitPrice(sku) * effectiveExchangeRate) }})
                    </div>
                  </div>

                  <!-- Qty Modifier -->
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      @click="updateSkuQty(skuIdx, -1)"
                      class="w-8 h-8 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold flex items-center justify-center transition active:scale-95"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      :value="sku.quantity"
                      min="1"
                      :max="getSkuStock(sku.color, sku.size) === Infinity ? undefined : getSkuStock(sku.color, sku.size)"
                      @change="onSkuQtyInput(skuIdx, $event)"
                      class="w-14 h-8 bg-white border border-gray-300 rounded-xl text-center font-bold font-mono text-gray-900 text-xs focus:ring-1 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      @click="updateSkuQty(skuIdx, 1)"
                      class="w-8 h-8 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold flex items-center justify-center transition active:scale-95"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      @click="removeSku(skuIdx)"
                      class="w-8 h-8 rounded-xl bg-gray-200 hover:bg-rose-100 hover:text-rose-600 text-gray-500 flex items-center justify-center ml-1.5 transition"
                      title="품목 삭제"
                    >
                      <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <!-- 5. Mini Cost Calculator Summary Card (보기 전용에서는 숨김 — 발주 금액 계산) -->
            <div v-if="!readonly" class="bg-slate-900 text-white rounded-3xl p-5 space-y-3 shadow-xl">
              <div class="flex items-center justify-between text-xs text-slate-300">
                <span>총 발주 수량:</span>
                <span class="font-bold text-white font-mono text-sm">{{ totalQuantity }} 개</span>
              </div>
              <div class="flex items-center justify-between pt-2.5 border-t border-slate-700">
                <span class="text-xs text-slate-300">순수 상품 원가:</span>
                <div class="text-right">
                  <span class="font-mono text-rose-400 font-bold text-sm">¥ {{ totalPriceRmb.toFixed(2) }}</span>
                  <span class="font-mono font-black text-amber-400 ml-2 text-base">약 ₩ {{ formatKrw(totalPriceKrw) }}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- ======================================================== -->
        <!-- 2. SIMILAR PRODUCTS RECOMMENDATION GRID -->
        <!-- ======================================================== -->
        <!-- 지연 로드 센티넬: 이 지점이 실제로 화면에 들어올 때 비로소 유사 상품을 부른다.
             (아래 섹션은 v-if라 로드 전에는 DOM에 없으므로 관찰 대상이 될 수 없다)
             !mt-0 : 부모 space-y-10이 자식마다 붙이는 40px 간격을 이 센티넬에는 적용하지 않아
                     레이아웃을 이전과 동일하게 유지한다. -->
        <div ref="similarSentinelRef" class="h-0 w-full !mt-0" aria-hidden="true"></div>

        <div v-if="isLoadingSellerProducts || sellerProducts.length > 0" class="pt-8 border-t border-gray-100 space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <h3 class="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                <i class="fas fa-th-large text-rose-500"></i>
                <span>비슷한 상품 더 보기</span>
              </h3>
              <p class="text-xs text-gray-500">
                동일 카테고리의 유사 상품입니다. 클릭 시 해당 상품으로 전환됩니다.
              </p>
            </div>

            <span v-if="sellerProducts.length" class="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
              총 {{ sellerProducts.length }}개
            </span>
          </div>

          <!-- Loading State (스켈레톤) -->
          <div v-if="isLoadingSellerProducts" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            <div v-for="n in 6" :key="n" class="bg-white rounded-2xl border border-gray-100 p-2.5 animate-pulse">
              <div class="aspect-square bg-gray-200 rounded-xl mb-2"></div>
              <div class="h-2.5 bg-gray-200 rounded w-3/4 mb-1.5"></div>
              <div class="h-2.5 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>

          <!-- Products Grid -->
          <div v-else-if="sellerProducts.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            <div
              v-for="sp in sellerProducts"
              :key="sp.id"
              @click="selectAnotherProduct(sp)"
              class="group bg-white rounded-2xl border border-gray-200 hover:border-rose-400 hover:shadow-md transition-all p-2.5 cursor-pointer flex flex-col justify-between"
            >
              <!-- Thumbnail -->
              <div class="aspect-square bg-gray-100 rounded-xl overflow-hidden relative mb-2">
                <img 
                  :src="sp.imageUrl" 
                  :alt="sp.titleKo"
                  class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  referrerpolicy="no-referrer"
                  @error="handleImageFallback"
                />
                <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold rounded">
                  MOQ {{ sp.minOrder || 1 }}
                </span>
              </div>

              <!-- Content -->
              <div class="space-y-1">
                <h4 class="text-xs font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-rose-600 transition">
                  {{ sp.titleKo || sp.titleZh }}
                </h4>
                <div class="flex items-baseline justify-between pt-1">
                  <span class="text-xs font-black text-rose-600 font-mono">¥ {{ sp.priceFormatted || sp.price }}</span>
                  <span class="text-[11px] text-gray-400 font-mono">₩{{ formatKrw(Number(sp.price) * effectiveExchangeRate) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- 3. 1688 DETAIL IMAGES LIST (Vertical Continuous Rendering) -->
        <!-- ======================================================== -->
        <div class="pt-8 border-t border-gray-100 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <i class="fas fa-images text-rose-600"></i>
              <span>1688 상품 상세 정보 & 설명 이미지</span>
            </h3>
            <span class="text-xs text-gray-400 font-medium">1688 중국 본토 공식 상세페이지 실시간 연동</span>
          </div>

          <div class="flex flex-col items-center bg-gray-50/80 p-3 sm:p-6 rounded-3xl border border-gray-200/80 min-h-[200px]">
            <template v-if="detailImages.length">
              <div class="w-full max-w-4xl space-y-2">
                <img
                  v-for="(imgUrl, idx) in detailImages"
                  :key="idx"
                  :src="imgUrl"
                  :alt="`상세 이미지 ${idx + 1}`"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  class="w-full h-auto block rounded-xl shadow-sm border border-gray-100"
                  @error="handleDetailImageError(idx)"
                />
              </div>
            </template>
            <div v-else-if="isLoadingDetail" class="py-16 text-center text-gray-400 text-xs sm:text-sm flex flex-col items-center gap-3">
              <i class="fas fa-spinner fa-spin text-rose-500 text-2xl"></i>
              <span>1688 고화질 상세페이지 이미지를 불러오는 중입니다...</span>
            </div>
            <div v-else class="py-16 text-center text-gray-400 text-xs sm:text-sm">
              상세 이미지를 불러오는 중이거나 제공되지 않는 상품입니다.
            </div>
          </div>
        </div>


      </div>

      <!-- ======================================================== -->
      <!-- 4. FIXED BOTTOM ACTIONS BAR (Sticky Bottom) -->
      <!-- ======================================================== -->
      <div v-if="!readonly" class="sticky bottom-0 z-20 px-5 py-3.5 sm:px-8 sm:py-4 border-t border-gray-200 bg-white/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-lg">
        
        <div class="text-xs text-gray-500 hidden sm:block">
          <template v-if="selectedSkus.length > 0">
            <span class="font-bold text-gray-800">총 {{ totalQuantity }}개</span> 선택됨 (합계: <b class="text-rose-600 font-mono font-bold text-sm">₩{{ formatKrw(totalPriceKrw) }}</b>)
          </template>
          <template v-else>
            <span class="text-gray-400 font-medium">옵션을 선택하면 발주 금액이 계산됩니다.</span>
          </template>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <!-- ★ 내상품리스트(찜) 토글 -->
          <button
            type="button"
            @click="toggleSavedProduct"
            :disabled="isSavedProductBusy"
            class="shrink-0 h-12 px-4 sm:px-5 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            :class="isProductSaved
              ? 'border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-amber-600 hover:border-amber-300'"
            :title="isProductSaved ? '내상품리스트에서 빼기' : '내상품리스트에 담기'"
          >
            <i v-if="isSavedProductBusy" class="fas fa-spinner fa-spin"></i>
            <i v-else :class="isProductSaved ? 'fas fa-star text-amber-500' : 'far fa-star'"></i>
            <span class="whitespace-nowrap">{{ isProductSaved ? '찜 완료' : '찜하기' }}</span>
          </button>

          <!-- 🛍️ 발주대기 보관함 담기 / 옵션 변경 적용 (mode에 따라 분기) -->
          <button
            type="button"
            @click="handleSaveToCart"
            class="flex-1 sm:flex-none sm:w-auto min-w-[200px] sm:min-w-[240px] h-12 px-6 sm:px-8 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer text-sm sm:text-base"
          >
            <i class="fas fa-shopping-bag"></i>
            <span v-if="mode === 'edit'">
              옵션 변경 적용<template v-if="totalQuantity > 0"> ({{ totalQuantity }}개)</template>
            </span>
            <span v-else>
              발주대기 보관함 담기<template v-if="totalQuantity > 0"> ({{ totalQuantity }}개)</template>
            </span>
          </button>
        </div>

      </div>

    </div>

    <!-- ======================================================== -->
    <!-- 5. CART CONFIRMATION POPUP MODAL -->
    <!-- ======================================================== -->
    <div 
      v-if="isCartConfirmModalOpen" 
      class="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
    >
      <div class="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-scale-in">
        <div class="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3 text-xl">
          <i class="fas fa-shopping-bag"></i>
        </div>
        <h3 class="text-base font-bold text-slate-900 mb-1">보관함 담기 완료</h3>
        <p class="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed font-medium">
          선택하신 상품이 보관함에 정상적으로 담겼습니다.<br />
          <span class="text-slate-900 font-bold">다른제품들을 계속 주문하시겠습니까?</span>
        </p>
        
        <div class="flex items-center gap-2.5">
          <!-- 1. 계속 쇼핑하기: 팝업 및 상세창 닫고 소싱몰 상품 목록 유지 -->
          <button 
            type="button"
            @click="handleContinueShopping"
            class="flex-1 h-11 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer"
          >
            계속 쇼핑하기
          </button>

          <!-- 2. 장바구니 바로가기: /dashboard/cart 로 이동 -->
          <button 
            type="button"
            @click="handleGoToCart"
            class="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer"
          >
            장바구니 바로가기
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getItemDetail1688, search1688WithTranslation, fetch1688ProductById, search1688ByImageUrl, cleanForeignText, hasHangul } from '../services/api1688'
import { getCartStorageKey, isLoggedIn, openLoginModal } from '../lib/auth'
// sumQty는 장바구니 담기 MOQ 합계 계산에만 쓰였고, 그 로직이 utils/cartWriter.js로
// 이동하면서 이 파일에서는 더 이상 호출되지 않는다 (resolveMoq는 :947에서 계속 사용).
import { resolveMoq } from '../utils/moq'
import { isSkuPricedSkus } from '../utils/priceTier'
import {
  readCart,
  checkOfferMoq,
  buildCartRowsFromSkus,
  resolveSkuImageUrl,
  findZeroQuantityRows,
  findInvalidPriceRows,
  mergeAndSaveCart
} from '../utils/cartWriter'
import { currentSettings, fetchSiteSettings } from '../lib/settings'
import {
  findSavedProduct,
  saveProduct,
  removeSavedProduct,
  resolveMajorCategoryId,
  hasSupabaseSession,
  ADMIN_SESSION_MESSAGE
} from '../lib/savedProducts'



const props = defineProps({
  product: {
    type: Object,
    default: null
  },
  exchangeRate: {
    type: Number,
    default: 0
  },
  // 'view': 소싱몰 신규 담기 모드 (기본)
  // 'edit': 장바구니 기존 행 옵션 교체 모드
  mode: {
    type: String,
    default: 'view'
  },
  // 찜할 때 자동 지정할 대분류 이름(categories.name_ko).
  // 카테고리/네비로 들어온 목록에서만 채워지고, 그 외(키워드·사진 검색 등)는 빈 문자열.
  autoCategoryName: {
    type: String,
    default: ''
  },
  // 보기 전용 모드 (관리자 주문 상세모달에서 상품을 확인만 할 때).
  // true면 주문으로 이어지는 요소(찜, 담기, 수량·옵션 선택, 발주 품목 박스)를 숨긴다.
  // 상품 정보·옵션 목록·가격·이미지는 그대로 보인다.
  // ※ false(기본값)일 때의 동작은 기존과 완전히 동일하다.
  readonly: {
    type: Boolean,
    default: false
  }
})

const effectiveExchangeRate = computed(() => {
  return Number(props.exchangeRate) || Number(currentSettings.value?.exchange_rate) || 200.0
})

const emit = defineEmits(['close', 'added-to-cart', 'change-product'])
const router = useRouter()
const isCartConfirmModalOpen = ref(false)

// DOM Ref
const modalContainerRef = ref(null)
const modalBodyRef = ref(null)

// ----------------------------------------------------
// State
// ----------------------------------------------------
const currentItem = ref(null)
const activeImage = ref('')
const selectedColor = ref(null)
const selectedColorId = ref(null)  // colorOptions 재계산 후에도 안정적인 ID 비교용
const selectedSize = ref(null)
const selectedSkus = ref([])

const detailImages = ref([])
const isLoadingDetail = ref(false)

// 상품 상세 SKU 비동기 조회 중 플래그 (true = 스켈레톤, false = 실제 옵션 렌더링)
const isDetailLoading = ref(true)

// fetch1688ProductById(item_get) 실패 플래그 — true면 currentItem.value가 검색결과의
// 빈약한 데이터(sellerId 미포함 등) 그대로라는 뜻. 담기 시 이 값으로 차단한다.
const productLoadFailed = ref(false)

const sellerProducts = ref([])
const isLoadingSellerProducts = ref(false)

// ── 유사 상품 지연 로드 상태 ──────────────────────────────────────────────
// 유사 상품은 서버 공용 캐시가 없어 고객마다 1회씩 OneBound 호출이 나간다.
// 볼 생각이 없는 고객에게는 호출이 나가지 않도록 모달을 열자마자 부르지 않고,
// 센티넬(=유사 상품 영역 위치)에 가까워졌을 때 상품당 1회만 부른다.
const similarSentinelRef = ref(null)
let similarObserver = null
// 센티넬이 지금 (아래 여유분 포함) 감지 범위 안에 있는가
const isSimilarSentinelVisible = ref(false)
// 이미 유사 상품을 불러온 상품 id (모달 안에서 상품을 바꾸면 새 id 기준 1회 다시 부름)
const similarLoadedForId = ref('')

// 센티넬이 화면에 닿기 전에 미리 부르기 시작하는 여유(px).
// 모달 본문(max-h-[88vh]에서 상단 헤더·하단 액션바를 뺀 영역)의 가시 높이가
// 약 600~650px = "모달 본문 1스크롤 분량". 그만큼 앞서 시작하면 사용자가
// 유사 상품 영역에 도달했을 때는 이미 로드가 끝나 스켈레톤이 보이지 않는다.
const SIMILAR_PREFETCH_MARGIN_PX = 600

// 스크롤바를 한 번에 맨 아래로 끌면 센티넬을 "지나쳐" 교차 전이가 일어나지 않아
// IntersectionObserver가 한 번도 발화하지 않는다(상세 설명이 긴 상품에서 재현).
// 본문이 바닥 근처에 닿으면 센티넬 감지와 무관하게 1회 로드해 이를 보완한다.
const SIMILAR_BOTTOM_THRESHOLD_PX = 300

// 모달 안에서 다른 상품으로 전환할 때 상단으로 "부드럽게" 스크롤하는 동안(약 0.5초)
// 그 프로그램 스크롤이 사용자의 스크롤로 오인돼 새 상품을 곧바로 불러오는 것을 막는다.
let suppressScrollTriggerUntil = 0

// ----------------------------------------------------
// Favorite Store (단골상점 찜) State & Methods
// ----------------------------------------------------
const LS_FAVORITE_STORES_KEY = 'euchs_favorite_stores'
const isStoreFavorite = ref(false)

const getStoreInfo = () => {
  const item = currentItem.value || props.product || {}
  const raw = item.raw || {}
  const seller = raw.seller || raw.shop || {}
  const shopName = item.company || item.sellerName || item.shopName || seller.companyName || seller.shopName || seller.name || '1688 우수 검증 제조공장'
  const shopId = item.sellerId || item.shopId || item.userId || seller.userId || seller.memberId || item.company || item.id || 'store-1688'
  const shopThumbnail = activeImage.value || item.imageUrl || item.images?.[0] || ''
  return { shopId, shopName, shopThumbnail }
}

const checkStoreFavorite = () => {
  try {
    const { shopId, shopName } = getStoreInfo()
    const raw = localStorage.getItem(LS_FAVORITE_STORES_KEY)
    if (!raw) {
      isStoreFavorite.value = false
      return
    }
    const favs = JSON.parse(raw)
    if (Array.isArray(favs)) {
      isStoreFavorite.value = favs.some(s => s.id === shopId || s.shopId === shopId || (s.shopName && s.shopName === shopName))
    } else {
      isStoreFavorite.value = false
    }
  } catch (e) {
    isStoreFavorite.value = false
  }
}

const toggleFavoriteStore = () => {
  try {
    const { shopId, shopName, shopThumbnail } = getStoreInfo()
    const raw = localStorage.getItem(LS_FAVORITE_STORES_KEY)
    let favs = raw ? JSON.parse(raw) : []
    if (!Array.isArray(favs)) favs = []

    const idx = favs.findIndex(s => s.id === shopId || s.shopId === shopId || (s.shopName && s.shopName === shopName))

    if (idx >= 0) {
      favs.splice(idx, 1)
      isStoreFavorite.value = false
      showToastNotification('단골 상점에서 제외되었습니다.', 'warning')
    } else {
      const newStore = {
        id: shopId,
        shopId: shopId,
        shopName: shopName,
        shopNameKo: currentItem.value?.companyKo || '',
        shopUrl: currentItem.value?.shopUrl || (shopId ? `https://shop.1688.com/shop/ent_shop.htm?_col=1&memberId=${shopId}` : ''),
        orderCount: 0,
        totalQuantity: 0,
        totalAmountKrw: 0,
        thumbnails: [shopThumbnail].filter(Boolean),
        repProductImg: shopThumbnail,
        category: currentItem.value?.categoryName || '1688 수입공장',
        badges: ['슈퍼팩토리', '품질 검증 공장'],
        addedAt: new Date().toISOString()
      }
      favs.unshift(newStore)
      isStoreFavorite.value = true
      showToastNotification('⭐ 단골 상점으로 등록되었습니다! (구매한 상점모음에서 확인 가능)', 'success')
    }

    localStorage.setItem(LS_FAVORITE_STORES_KEY, JSON.stringify(favs))
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new CustomEvent('euchs:stores-updated', { detail: { stores: favs } }))
  } catch (err) {
    console.error('Failed to toggle favorite store:', err)
  }
}

// ----------------------------------------------------
// Dynamic Options (1차 속성 & 2차 속성) & Gallery
// ----------------------------------------------------


// 1688 원본 상품 링크 (새 탭 바로가기)
const original1688Url = computed(() => {
  const item = currentItem.value || props.product || {}
  const raw = item.raw || {}

  // 1순위: Otapi 원본 URL 필드 (TaobaoItemUrl, ExternalItemUrl, ItemUrl)
  const otapiUrl = raw.TaobaoItemUrl || raw.ExternalItemUrl || raw.ItemUrl || ''
  if (otapiUrl && otapiUrl.startsWith('http')) return otapiUrl

  // 2순위: 정규화된 sourceUrl / detailUrl
  const rawUrl = item.sourceUrl || item.detailUrl || item.url || ''
  if (rawUrl && rawUrl.startsWith('http')) return rawUrl

  // 3순위: 순수 숫자 ID 추출 (abb- 등 Otapi 접두사 제거) → 1688 URL 생성
  const rawId = item.id || item.itemId || item.offerId || item.num_iid || props.product?.id || ''
  const cleanId = String(rawId).replace(/[^0-9]/g, '')
  return cleanId ? `https://detail.1688.com/offer/${cleanId}.html` : 'https://www.1688.com'
})

const displayProductTitle = computed(() => {
  const item = currentItem.value || props.product || {}
  const rawTitle = item.titleKo || item.title || item.subject || item.titleZh || props.product?.titleKo || props.product?.title || ''
  const cleaned = cleanForeignText(rawTitle)
  return cleaned || rawTitle || '1688 실시간 도매 상품'
})

const firstPropName = computed(() => {
  const item = currentItem.value || props.product || {}
  const raw = item.raw || {}
  const p = item.skuProps?.[0]?.prop || item.skuProps?.[0]?.propKo || item.skuProps?.[0]?.propName ||
            raw.skuProps?.[0]?.prop || raw.skuProps?.[0]?.propKo ||
            raw.sku?.skuProps?.[0]?.prop || raw.sku?.skuProps?.[0]?.propName ||
            props.product?.skuProps?.[0]?.prop || props.product?.skuProps?.[0]?.propKo
  const cleaned = cleanForeignText(p)
  if (cleaned && !/[\u0400-\u04ff]/i.test(cleaned)) {
    return String(cleaned).trim()
  }
  return '색상/옵션'
})

const secondPropName = computed(() => {
  const item = currentItem.value || props.product || {}
  const raw = item.raw || {}
  const p = item.skuProps?.[1]?.prop || item.skuProps?.[1]?.propKo || item.skuProps?.[1]?.propName ||
            raw.skuProps?.[1]?.prop || raw.skuProps?.[1]?.propKo ||
            raw.sku?.skuProps?.[1]?.prop || raw.sku?.skuProps?.[1]?.propName ||
            props.product?.skuProps?.[1]?.prop || props.product?.skuProps?.[1]?.propKo
  const cleaned = cleanForeignText(p)
  if (cleaned && !/[\u0400-\u04ff]/i.test(cleaned)) {
    return String(cleaned).trim()
  }
  return '사이즈/규격'
})

// ----------------------------------------------------
// Price Tiers (수량별 실시간 도매 단가표 계산)
// ----------------------------------------------------
const basePrice = computed(() => {
  const item = currentItem.value || props.product
  const p = Number(item?.price || item?.raw?.price || props.product?.price || props.product?.raw?.price)
  return (!isNaN(p) && p > 0) ? p : 0
})

// ── SKU 배열 단일 출처 ──────────────────────────────────────────────────────
// 가격/재고/specId 판정이 모두 이 배열 하나를 본다 (api1688.js parsedSkus).
const skuRows = computed(() => {
  const item = currentItem.value || props.product || {}
  if (Array.isArray(item.skus) && item.skus.length > 0) return item.skus
  if (Array.isArray(props.product?.skus) && props.product.skus.length > 0) return props.product.skus
  return []
})

// ── SKU별 가격 상품 판정 (가격 출처를 가르는 단일 기준) ────────────────────
// 판정 로직은 utils/priceTier.js 공용 함수. CartView 수량 재계산도 같은 기준을 쓴다.
const isSkuPricedProduct = computed(() => isSkuPricedSkus(skuRows.value))

// color+size 조합의 SKU 단가(CNY) 반환. 매칭 실패 시 null.
// 매칭 순서는 getSkuStock / getSkuSpecId와 동일하게 맞춘다 (같은 조합이 서로 다른
// SKU 행으로 해석되면 가격·재고·specId가 어긋나므로 반드시 동일해야 함).
const getSkuUnitPrice = (color, size) => {
  const skus = skuRows.value
  if (skus.length === 0) return null

  const cStr = String(color || '').trim()
  const sStr = String(size || '').trim()
  const priceOf = (sk) => {
    const v = Number(sk?.price)
    return (!isNaN(v) && v > 0) ? v : null
  }

  // 1. color + size 정확 매칭
  if (cStr && sStr) {
    const match = skus.find(sk => String(sk.color || '').trim() === cStr && String(sk.size || '').trim() === sStr)
    const v = priceOf(match)
    if (v !== null) return v
  }
  // 2. size만 매칭 (단일 색상 상품)
  if (sStr) {
    const match = skus.find(sk => String(sk.size || '').trim() === sStr)
    const v = priceOf(match)
    if (v !== null) return v
  }
  // 3. color만 매칭 (단일 규격 상품)
  if (cStr) {
    const match = skus.find(sk => String(sk.color || '').trim() === cStr)
    const v = priceOf(match)
    if (v !== null) return v
  }
  // 4. 단일 SKU 상품 — 첫 번째 행
  if (skus.length === 1) {
    const v = priceOf(skus[0])
    if (v !== null) return v
  }
  return null
}

// 품목 행 추가 시점에 확정할 단가. SKU 가격 상품인데 매칭이 실패하면 원인을 반드시 남긴다.
const resolveRowUnitPrice = (color, size) => {
  const skuPrice = getSkuUnitPrice(color, size)
  if (skuPrice !== null) return skuPrice
  if (isSkuPricedProduct.value) {
    console.error(
      `[ProductDetailModal] SKU 단가 매칭 실패 — 상품 단가로 대체합니다. color="${color}" size="${size}"`,
      skuRows.value
    )
  }
  return basePrice.value
}

const minOrder = computed(() => {
  const item = currentItem.value || props.product
  // 출처 키는 minOrder 단일 확정 (api1688.js가 min_num → minOrder로 정규화).
  // 상한 폴백(>10000 → 1)은 이상값에서 MOQ 가드를 조용히 끄는 구멍이라 제거.
  let mo = resolveMoq(item?.minOrder)
  return mo
})

const displayedPriceTiers = computed(() => {
  const item = currentItem.value || props.product
  const p = basePrice.value
  const mo = minOrder.value

  const rawTiers = item?.priceTiers || item?.raw?.priceTiers || props.product?.priceTiers || null

  // ── 1. SKU별 가격 상품 (최우선) ────────────────────────────────────────────
  // 1688 규칙: SKU 가격이 서로 다르면 SKU 가격이 기준이고 구간 단가는 쓰지 않는다.
  // 이 박스는 "적용 단가"가 아니라 옵션별 단가의 범위만 알린다. 실제 적용 단가는
  // 선택된 발주 품목의 각 줄이 자기 SKU 가격으로 독립 보유한다(rowUnitPrice).
  // (기존에는 selectedColor로 단가 1개를 resolve해서, 옵션을 누를 때마다 박스와
  //  이미 담긴 줄들의 가격이 통째로 마지막 선택 옵션 가격으로 바뀌는 버그가 있었음)
  if (isSkuPricedProduct.value) {
    const prices = skuRows.value.map(s => Number(s.price) || 0).filter(v => v > 0)
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    return [{
      minQuantity: mo,
      maxQuantity: null,
      label: `옵션별 단가 (최소 ${mo}개)`,
      price: Number(minP.toFixed(2)),
      priceFormatted: `${minP.toFixed(2)} ~ ${maxP.toFixed(2)}`,
      priceKrw: Math.round(minP * effectiveExchangeRate.value),
      priceKrwFormatted: `${formatKrw(minP * effectiveExchangeRate.value)} ~ ${formatKrw(maxP * effectiveExchangeRate.value)}`,
      isSkuRange: true
    }]
  }

  // ── 2. item.priceTiers (api1688.js → fetch1688ProductById가 파싱한 1688 원본 수량 구간) ──
  // SKU 가격이 전부 같거나 없는 상품에서만 도달한다 = 진짜 수량별 가격 상품.
  if (Array.isArray(rawTiers) && rawTiers.length > 1) {

    return rawTiers.map((tier) => {
      const minQ   = Number(tier.minQty || tier.minQuantity || tier.min || tier.beginAmount || 1)
      const maxQ   = (tier.maxQty != null || tier.maxQuantity != null)
        ? Number(tier.maxQty ?? tier.maxQuantity)
        : null
      const price  = parseFloat(tier.price || tier.unitPrice || p) || p
      return {
        minQuantity: minQ,
        maxQuantity: maxQ,
        label: tier.label || (maxQ ? `${minQ}~${maxQ}개` : `${minQ}개 이상`),
        price: Number(price.toFixed(2)),
        priceFormatted: price.toFixed(2),
        priceKrw: Math.round(price * effectiveExchangeRate.value)
      }
    })
  }

  // ── 3. priceTiers가 1개인 경우 그대로 사용 ──
  if (Array.isArray(rawTiers) && rawTiers.length === 1) {
    const tier = rawTiers[0]
    const minQ  = Number(tier.minQty || tier.minQuantity || tier.min || tier.beginAmount || 1)
    const maxQ  = (tier.maxQty != null || tier.maxQuantity != null)
      ? Number(tier.maxQty ?? tier.maxQuantity)
      : null
    const price = parseFloat(tier.price || tier.unitPrice || p) || p
    return [{
      minQuantity: minQ,
      maxQuantity: maxQ,
      label: tier.label || (maxQ ? `${minQ}~${maxQ}개` : `${minQ}개 이상`),
      price: Number(price.toFixed(2)),
      priceFormatted: price.toFixed(2),
      priceKrw: Math.round(price * effectiveExchangeRate.value)
    }]
  }

  // ── 4. 구간도 없고 SKU 가격 변동도 없는 경우: 단일 대표 가격 1개 ──
  if (!p || p <= 0) return []

  return [
    {
      minQuantity: mo,
      maxQuantity: null,
      label: `${mo}개 이상`,
      price: Number(p.toFixed(2)),
      priceFormatted: p.toFixed(2),
      priceKrw: Math.round(p * effectiveExchangeRate.value)
    }
  ]
})



// 총 수량에 따른 현재 적용 단가 결정 (CN인사이더 스타일)
const currentUnitRmb = computed(() => {
  const q = totalQuantity.value
  const tiers = displayedPriceTiers.value
  if (!tiers || tiers.length === 0) return basePrice.value

  for (let i = tiers.length - 1; i >= 0; i--) {
    if (q >= tiers[i].minQuantity) {
      return tiers[i].price
    }
  }

  return tiers[0]?.price || basePrice.value
})

// ── 선택된 발주 품목 "각 줄"의 단가 (가격의 단일 출처) ─────────────────────
// SKU별 가격 상품: 줄이 담길 때 확정한 자기 SKU 단가를 그대로 유지한다.
//   → 다른 옵션을 추가/삭제하거나 수량을 바꿔도 이 줄의 단가는 변하지 않는다.
// 그 외(SKU 가격이 전부 같거나 없는 상품): 총 수량 기준 구간 단가(기존 동작 유지).
const rowUnitPrice = (row) => {
  if (isSkuPricedProduct.value) {
    const stored = Number(row?.unitPriceCny)
    if (!isNaN(stored) && stored > 0) return stored
    // unitPriceCny가 비어 있는 줄(구 데이터 등)은 지금 다시 매칭해서 채운다.
    return resolveRowUnitPrice(row?.color, row?.size)
  }
  return currentUnitRmb.value
}

const colorOptions = computed(() => {
  const item = currentItem.value || props.product || {}
  const raw = item.raw || {}
  const mainImg = item.imageUrl || props.product?.imageUrl || raw.imageUrl || raw.image || ''

  // ── Branch 1: item.skuProps[0].values (가장 우선, loadFullProductData 이후 채워짐)
  const skuPropsArr = Array.isArray(item.skuProps) && item.skuProps.length > 0
    ? item.skuProps
    : (Array.isArray(props.product?.skuProps) && props.product.skuProps.length > 0 ? props.product.skuProps : null)

  if (skuPropsArr?.[0] && Array.isArray(skuPropsArr[0].values) && skuPropsArr[0].values.length > 0) {
    const list = skuPropsArr[0].values.map((v, i) => {
      const name = typeof v === 'string' ? v : (v.nameKo || v.name || v.nameZh || v.value || v.text || '')
      const cleanedName = cleanForeignText(name) || name
      const img = typeof v === 'object' ? (v.imageUrl || v.image || v.imgUrl || v.picUrl || '') : ''
      // colorId: propValueId(있으면) 또는 인덱스 기반 안정 ID — 재계산 후에도 동일 값 보장
      const colorId = (typeof v === 'object' && v.propValueId) ? String(v.propValueId) : `_b1_${i}`
      return { colorId, name: String(cleanedName).trim(), imageUrl: img || mainImg }
    }).filter(opt => opt.name && opt.name !== 'undefined' && opt.name !== 'null')
    if (list.length > 0) {
      console.debug('[colorOptions] Branch 1 (skuProps[0].values):', list.length, 'items')
      return list
    }
  }

  // ── Branch 2: item.colors 배열
  const directColors = Array.isArray(item.colors) && item.colors.length > 0
    ? item.colors
    : (Array.isArray(props.product?.colors) && props.product.colors.length > 0 ? props.product.colors : null)
  if (directColors) {
    const list = directColors.map((c, i) => {
      const name = typeof c === 'string' ? c : (c.nameKo || c.name || c.value || '')
      const cleanedName = cleanForeignText(name) || name
      const img = typeof c === 'object' ? (c.imageUrl || c.image || '') : ''
      const colorId = `_b2_${i}`
      return { colorId, name: String(cleanedName).trim(), imageUrl: img || mainImg }
    }).filter(opt => opt.name && opt.name !== 'undefined' && opt.name !== 'null')
    if (list.length > 0) {
      console.debug('[colorOptions] Branch 2 (colors array):', list.length, 'items')
      return list
    }
  }

  // ── Branch 3: raw.skuProps[0].values
  const rawSP = raw.skuProps || raw.sku?.skuProps || raw.sku_props || props.product?.raw?.skuProps
  if (Array.isArray(rawSP) && rawSP.length > 0 && Array.isArray(rawSP[0]?.values) && rawSP[0].values.length > 0) {
    const list = rawSP[0].values.map((v, i) => {
      const name = typeof v === 'string' ? v : (v.nameKo || v.name || v.nameZh || v.value || v.text || '')
      const cleanedName = cleanForeignText(name) || name
      const img = typeof v === 'object' ? (v.imageUrl || v.image || v.imgUrl || v.picUrl || '') : ''
      const colorId = (typeof v === 'object' && v.propValueId) ? String(v.propValueId) : `_b3_${i}`
      return { colorId, name: String(cleanedName).trim(), imageUrl: img || mainImg }
    }).filter(opt => opt.name && opt.name !== 'undefined' && opt.name !== 'null')
    if (list.length > 0) {
      console.debug('[colorOptions] Branch 3 (raw.skuProps[0].values):', list.length, 'items')
      return list
    }
  }

  // ── Branch 4: item.skus / item.skuList에서 1차 색상 역추출
  const skusArr = (
    Array.isArray(item.skus) && item.skus.length > 0 ? item.skus :
    Array.isArray(props.product?.skus) && props.product.skus.length > 0 ? props.product.skus :
    Array.isArray(raw.skus) && raw.skus.length > 0 ? raw.skus :
    Array.isArray(raw.skuList) && raw.skuList.length > 0 ? raw.skuList : []
  )
  if (skusArr.length > 0) {
    const seen = new Map()
    skusArr.forEach(s => {
      const rawC = s.color || s.propName || s.name || s.colorName || ''
      const c = cleanForeignText(rawC) || rawC
      if (c && !seen.has(c)) seen.set(c, s.imageUrl || s.image || mainImg)
    })
    if (seen.size > 0) {
      console.debug('[colorOptions] Branch 4 (skus color):', seen.size, 'items')
      return [...seen.entries()].map(([name, imageUrl], i) => ({
        colorId: `_b4_${i}`,
        name: String(name).trim(),
        imageUrl: imageUrl || mainImg
      }))
    }
  }

  // ── Fallback: 로딩 중일 때는 빈 배열, 로딩 완료 후에만 단일 상품 '기본 단품' 반환
  if (isDetailLoading.value) {
    return []
  }

  console.debug('[colorOptions] Fallback: 기본 단품 (skuProps empty or not yet loaded)')
  return [{ colorId: '_fallback', name: '기본 단품', imageUrl: mainImg }]
})


const sizeOptions = computed(() => {
  const item = currentItem.value || props.product || {}
  const raw = item.raw || {}

  // 1. skuProps[1]?.values 추출 (2차 규격/사이즈)
  const skuProps = (Array.isArray(item.skuProps) && item.skuProps.length > 1)
    ? item.skuProps
    : (Array.isArray(props.product?.skuProps) && props.product.skuProps.length > 1 ? props.product.skuProps : null)

  if (skuProps && skuProps[1] && Array.isArray(skuProps[1].values) && skuProps[1].values.length > 0) {
    const list = skuProps[1].values.map(v => {
      const name = typeof v === 'string' ? v : (v.nameKo || v.name || v.nameZh || v.value || v.text || '')
      const cleaned = cleanForeignText(name) || name
      return String(cleaned).trim()
    }).filter(name => name && name !== 'undefined' && name !== 'null')

    if (list.length > 0) return list
  }

  // 2. sizes / sizeList 배열 탐색
  const directSizes = (Array.isArray(item.sizes) && item.sizes.length > 0)
    ? item.sizes
    : (Array.isArray(props.product?.sizes) && props.product.sizes.length > 0 ? props.product.sizes : null)

  if (directSizes) {
    const list = directSizes.map(s => {
      const name = typeof s === 'string' ? s : (s.name || s.value || '')
      const cleaned = cleanForeignText(name) || name
      return String(cleaned).trim()
    }).filter(Boolean)
    if (list.length > 0) return list
  }

  // 3. raw 내부의 skuProps[1] 추출
  const rawSkuProps = raw.skuProps || raw.sku?.skuProps || raw.sku_props || props.product?.raw?.skuProps
  if (Array.isArray(rawSkuProps) && rawSkuProps.length > 1 && Array.isArray(rawSkuProps[1]?.values) && rawSkuProps[1].values.length > 0) {
    const list = rawSkuProps[1].values.map(v => {
      const name = typeof v === 'string' ? v : (v.nameKo || v.name || v.nameZh || v.value || v.text || '')
      const cleaned = cleanForeignText(name) || name
      return String(cleaned).trim()
    }).filter(name => name && name !== 'undefined' && name !== 'null')

    if (list.length > 0) return list
  }

  // 4. skus 배열에서 2차 옵션(size/spec) 추출
  const skus = (Array.isArray(item.skus) && item.skus.length > 0)
    ? item.skus
    : (Array.isArray(props.product?.skus) && props.product.skus.length > 0
        ? props.product.skus
        : (Array.isArray(raw.skus) && raw.skus.length > 0 ? raw.skus : (Array.isArray(raw.skuList) ? raw.skuList : [])))

  if (skus.length > 0) {
    const uniqueSizes = [...new Set(skus.map(s => s.size || s.subPropName || s.spec || s.sizeName).filter(Boolean))]
    if (uniqueSizes.length > 0) {
      return uniqueSizes.map(s => String(s).trim())
    }
  }

  // 5. 2차 옵션이 없으면 순수 빈 배열 (임의 생성 금지)
  return []
})

const sizeStockMap = computed(() => {
  const item = currentItem.value || props.product || {}
  const skus = (Array.isArray(item.skus) && item.skus.length > 0)
    ? item.skus
    : (Array.isArray(props.product?.skus) && props.product.skus.length > 0 ? props.product.skus : [])

  const map = {}
  if (skus.length === 0) return map

  const selColorName = selectedColor.value?.name || ''
  const isSingleAxis = !selColorName || selColorName === '기본 단품'

  skus.forEach(sk => {
    if (!sk.size) return
    const matches = isSingleAxis || sk.color === selColorName
    if (!matches) return

    const stockVal = typeof sk.stock === 'number' ? sk.stock : parseInt(sk.stock, 10)
    if (Number.isNaN(stockVal)) return

    if (map[sk.size] === undefined || stockVal > map[sk.size]) {
      map[sk.size] = stockVal
    }
  })

  return map
})

// 색상별 재고 맵 (단일 옵션 상품 — size 없는 경우를 위한 보조 맵)
const colorStockMap = computed(() => {
  const item = currentItem.value || props.product || {}
  const skus = (Array.isArray(item.skus) && item.skus.length > 0)
    ? item.skus
    : (Array.isArray(props.product?.skus) && props.product.skus.length > 0 ? props.product.skus : [])
  const map = {}
  skus.forEach(sk => {
    if (!sk.color) return
    const stockVal = typeof sk.stock === 'number' ? sk.stock : parseInt(sk.stock, 10)
    if (isNaN(stockVal)) return
    const key = String(sk.color).trim()
    if (map[key] === undefined || stockVal > map[key]) map[key] = stockVal
  })
  return map
})

// 이 색상이 "전부 품절"인지 판정 — 1차 옵션 버튼 비활성화 기준.
// colorStockMap은 같은 색상의 SKU 중 "최대" 재고를 담으므로, 값이 0이면
// 그 색상으로 고를 수 있는 SKU가 하나도 남지 않았다는 뜻이다.
//   · 2축 상품에서 일부 사이즈만 품절인 색상은 최대값이 0보다 커서 막히지 않는다
//     (그 사이즈는 2차 옵션 버튼이 이미 품절 처리한다).
//   · 재고 미파악(undefined / NaN으로 맵에 아예 없음 / 파싱 폴백 999)은 품절이 아니다.
//     반드시 === 0 으로만 판정한다. CLAUDE.md 5조: quantity=0(품절)만 정확히 반영.
const isColorSoldOut = (colorName) => {
  const key = String(colorName || '').trim()
  if (!key) return false
  return colorStockMap.value[key] === 0
}

// 2차 옵션(사이즈) 버튼의 비활성 조건.
// 기존 템플릿에 인라인으로 있던 식을 그대로 옮긴 것 — 판정은 한 글자도 바뀌지 않았다.
// :disabled와 :class가 같은 값을 보게 해서, 비활성일 때 hover 스타일이 붙지 않도록 한다.
const isSizeDisabled = (size) => {
  return !selectedColor.value || sizeStockMap.value[size] === 0 || sizeStockMap.value[size] === undefined
}

// 색상+사이즈 조합의 재고 상한 반환.
// 1순위: 원본 skus 배열에서 color+size 또는 단일 옵션 정확 매칭 탐색
// 2순위: sizeStockMap / colorStockMap 폴백
// 3순위: 재고 미파악(undefined/NaN) → Infinity (상한 없음으로 동작)
const getSkuStock = (color, size) => {
  const item = currentItem.value || props.product || {}
  const skus = (Array.isArray(item.skus) && item.skus.length > 0)
    ? item.skus
    : (Array.isArray(props.product?.skus) && props.product.skus.length > 0 ? props.product.skus : [])

  const cStr = String(color || '').trim()
  const sStr = String(size || '').trim()

  // 1. skus 배열에서 color + size 정확 매칭
  if (skus.length > 0) {
    if (cStr && sStr) {
      const match = skus.find(sk => String(sk.color || '').trim() === cStr && String(sk.size || '').trim() === sStr)
      if (match && match.stock !== undefined && match.stock !== null && match.stock !== '') {
        const val = typeof match.stock === 'number' ? match.stock : parseInt(match.stock, 10)
        if (!isNaN(val)) return val
      }
    }
    if (sStr) {
      const match = skus.find(sk => String(sk.size || '').trim() === sStr)
      if (match && match.stock !== undefined && match.stock !== null && match.stock !== '') {
        const val = typeof match.stock === 'number' ? match.stock : parseInt(match.stock, 10)
        if (!isNaN(val)) return val
      }
    }
    if (cStr) {
      const match = skus.find(sk => String(sk.color || '').trim() === cStr)
      if (match && match.stock !== undefined && match.stock !== null && match.stock !== '') {
        const val = typeof match.stock === 'number' ? match.stock : parseInt(match.stock, 10)
        if (!isNaN(val)) return val
      }
    }
  }

  // 2. computed 맵 폴백
  if (sStr) {
    const v = sizeStockMap.value[sStr]
    if (typeof v === 'number' && !isNaN(v)) return v
  }
  if (cStr) {
    const v = colorStockMap.value[cStr]
    if (typeof v === 'number' && !isNaN(v)) return v
  }
  return Infinity
}

// color+size 조합에 해당하는 1688 spec_id(32자리 hex) 반환.
// parsedSkus(api1688.js에서 specId 필드로 보존)에서 정확 매칭.
// 매칭 실패 시 '' 반환 — 발주 시 400 방지를 위해 반드시 채워야 하는 값.
const getSkuSpecId = (color, size) => {
  const item = currentItem.value || props.product || {}
  const skus = (Array.isArray(item.skus) && item.skus.length > 0)
    ? item.skus
    : (Array.isArray(props.product?.skus) && props.product.skus.length > 0 ? props.product.skus : [])

  const cStr = String(color || '').trim()
  const sStr = String(size || '').trim()

  if (skus.length > 0) {
    // 1. color + size 정확 매칭
    if (cStr && sStr) {
      const match = skus.find(sk => String(sk.color || '').trim() === cStr && String(sk.size || '').trim() === sStr)
      if (match?.specId) return String(match.specId)
    }
    // 2. size만 매칭 (단일 색상 상품)
    if (sStr) {
      const match = skus.find(sk => String(sk.size || '').trim() === sStr)
      if (match?.specId) return String(match.specId)
    }
    // 3. color만 매칭 (단일 규격 상품)
    if (cStr) {
      const match = skus.find(sk => String(sk.color || '').trim() === cStr)
      if (match?.specId) return String(match.specId)
    }
    // 4. 단일 SKU 상품 — 첫 번째 행
    if (skus.length === 1 && skus[0].specId) return String(skus[0].specId)
  }
  return ''
}

// color+size 조합의 이미지 반환 — 장바구니 행 썸네일용.
// 판정 규칙 자체는 utils/cartWriter.js의 resolveSkuImageUrl 공용 함수에 있다
// (장바구니 "옵션 변경/추가" 팝업도 같은 함수를 쓴다 — 규칙을 두 벌 만들지 않기 위함).
// 여기서는 이 모달의 데이터 출처(parsedSkus / colorOptions)만 묶어 넘긴다.
const getSkuImageUrl = (color, size) => {
  const item = currentItem.value || props.product || {}
  const skus = (Array.isArray(item.skus) && item.skus.length > 0)
    ? item.skus
    : (Array.isArray(props.product?.skus) && props.product.skus.length > 0 ? props.product.skus : [])

  return resolveSkuImageUrl({
    skus,
    colorValues: colorOptions.value,   // 1차 옵션 버튼 썸네일과 같은 출처
    color,
    size,
  })
}

// 다중 옵션 (2차 사이즈/규격 존재 여부: 1개 이상 존재할 때만 활성화)
const hasMultipleOptions = computed(() => {
  return Array.isArray(sizeOptions.value) && sizeOptions.value.length > 0
})

// 갤러리 이미지: item.images → raw.PictureList / Pictures / pic_urls / itemImages 다중 탐색
const galleryImages = computed(() => {
  const item = currentItem.value
  if (!item) return []

  const normalizeGalleryImg = (u) => {
    const s = String(u || '').trim()
    if (!s) return ''
    if (s.startsWith('//')) return 'https:' + s
    if (s.startsWith('http://')) return s.replace('http://', 'https://')
    return s.startsWith('http') ? s : ''
  }

  // 1순위: item.images (fetch1688ProductById가 채워준 정규화 배열)
  if (Array.isArray(item.images) && item.images.length > 0) {
    const imgs = item.images.map(normalizeGalleryImg).filter(Boolean)
    if (imgs.length > 0) return imgs
  }

  // 2순위: raw.PictureList (Otapi 원본)
  const raw = item.raw || {}
  if (Array.isArray(raw.PictureList) && raw.PictureList.length > 0) {
    const imgs = raw.PictureList.map(p =>
      normalizeGalleryImg(typeof p === 'string' ? p : (p.Url || p.url || p.Large || p.src || ''))
    ).filter(Boolean)
    if (imgs.length > 0) return imgs
  }

  // 3순위: raw.Pictures (Otapi Pictures)
  if (Array.isArray(raw.Pictures) && raw.Pictures.length > 0) {
    const imgs = raw.Pictures.map(p =>
      normalizeGalleryImg(typeof p === 'string' ? p : (p.Url || p.url || p.Large || p.Medium || p.src || ''))
    ).filter(Boolean)
    if (imgs.length > 0) return imgs
  }

  // 4순위: raw.pic_urls / raw.picUrls / raw.itemImages
  const altField = raw.pic_urls || raw.picUrls || raw.itemImages || raw.imgList || null
  if (Array.isArray(altField) && altField.length > 0) {
    const imgs = altField.map(img =>
      normalizeGalleryImg(typeof img === 'string' ? img : (img.url || img.src || img.Url || ''))
    ).filter(Boolean)
    if (imgs.length > 0) return imgs
  }

  // 5순위: SKU 옵션별 이미지에서 유니크 수집 (색상 옵션마다 이미지가 있는 경우)
  const skuImages = colorOptions.value
    .map(c => normalizeGalleryImg(c.imageUrl || ''))
    .filter(Boolean)
  const uniqueSkuImages = [...new Set(skuImages)]
  if (uniqueSkuImages.length > 1) return uniqueSkuImages  // 2장 이상일 때만

  // Fallback: 메인 이미지 1장
  const mainImg = normalizeGalleryImg(item.imageUrl || '')
  return mainImg ? [mainImg] : []
})

// ----------------------------------------------------
// Calculations
// ----------------------------------------------------
const totalQuantity = computed(() => {
  return selectedSkus.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
})

// 총액 = Σ(각 줄 단가 × 각 줄 수량). 전역 단가 1개로 일괄 곱하지 않는다.
const totalPriceRmb = computed(() => {
  const sum = selectedSkus.value.reduce(
    (acc, row) => acc + (Number(row.quantity) || 0) * rowUnitPrice(row),
    0
  )
  return Number(sum.toFixed(2))
})

const totalPriceKrw = computed(() => {
  return Math.round(totalPriceRmb.value * effectiveExchangeRate.value)
})

const formatKrw = (val) => {
  return Math.round(val || 0).toLocaleString('ko-KR')
}

// ----------------------------------------------------
// Option Selection Handlers (엄격한 단계별 유효성 검사)
// ----------------------------------------------------
const handleSelectColor = (color) => {
  if (props.readonly) return   // 보기 전용: 발주 품목 추가 금지
  selectedColor.value = color
  selectedColorId.value = color?.colorId ?? null  // ← 안정적 ID 동기화
  if (color.imageUrl) {
    activeImage.value = color.imageUrl
  }

  // 1. 단일 옵션 상품일 경우: 1차 선택 즉시 품목 리스트에 등록
  if (!hasMultipleOptions.value) {
    const colorName = String(color.name || '').trim()
    const existing = selectedSkus.value.find(s => s.color === colorName)
    if (existing) {
      // 이미 존재하면 해당 행의 quantity만 +1 — 재고 상한 체크 포함
      const nextQty = (Number(existing.quantity) || 1) + 1
      const stockLimit = getSkuStock(colorName, '')
      if (stockLimit !== Infinity && nextQty > stockLimit) {
        showToastNotification(`⚠️ 재고는 최대 ${stockLimit}개까지만 담을 수 있습니다.`, 'warning')
        return
      }
      existing.quantity = nextQty
    } else {
      // 품절 가드 — 재고가 정확히 0인 옵션은 발주 품목에 추가하지 않는다.
      //   기존에는 이 분기에만 재고 검사가 없어(위 +1 분기에는 있었음) 품절 옵션이
      //   수량 1로 추가되고, 담기 시 재고 상한 클램핑으로 수량 0이 되어
      //   성공 토스트와 함께 빈 행이 저장됐다.
      //   ※ Infinity(재고 미파악)는 막지 않는다. 정확히 0일 때만 차단한다.
      const newStockLimit = getSkuStock(colorName, '')
      if (newStockLimit === 0) {
        showToastNotification('⚠️ 품절된 옵션입니다. 다른 옵션을 선택해 주세요.', 'warning')
        return
      }
      // 신규 행 추가 — 초기 수량은 항상 1 (minOrder는 최소발주단위일 뿐 수량 기본값이 아님)
      selectedSkus.value.push({
        color: colorName,
        size: '',
        specId: getSkuSpecId(colorName, ''),
        // 이 줄의 단가를 담는 시점에 확정 — 이후 다른 옵션 선택에 영향받지 않는다
        unitPriceCny: resolveRowUnitPrice(colorName, ''),
        quantity: 1
      })
    }
  } else {
    // 2. 다중 옵션 상품일 경우: 2차 옵션 선택 대기
    selectedSize.value = null
  }
}

const handleSelectSize = (size) => {
  if (props.readonly) return   // 보기 전용: 발주 품목 추가 금지
  // 1차 옵션 미선택 가드
  if (!selectedColor.value) {
    showToastNotification(`⚠️ 1차 옵션(${firstPropName.value})을 먼저 선택해 주세요.`, 'warning')
    return
  }

  selectedSize.value = size
  const colorName = String(selectedColor.value.name || '').trim()
  const sizeName = String(size || '').trim()

  // 1차와 2차가 모두 선택 완료된 시점에 품목 리스트에 추가
  const existing = selectedSkus.value.find(s => s.color === colorName && s.size === sizeName)
  if (existing) {
    // 이미 존재하면 해당 행의 quantity만 +1 — 재고 상한 체크 포함
    const nextQty = (Number(existing.quantity) || 1) + 1
    const stockLimit = getSkuStock(colorName, sizeName)
    if (stockLimit !== Infinity && nextQty > stockLimit) {
      showToastNotification(`⚠️ 재고는 최대 ${stockLimit}개까지만 담을 수 있습니다.`, 'warning')
      return
    }
    existing.quantity = nextQty
  } else {
    // 품절 가드 — handleSelectColor 신규 행 분기와 동일 기준.
    //   2차 옵션 버튼이 이미 품절 사이즈를 비활성화하고 있어 UI로는 도달하지 않지만,
    //   같은 결함(신규 행 분기에만 재고 검사가 없음)이 이쪽에도 있어 함께 막는다.
    //   (CLAUDE.md 2-7 수량 입력 지점 전수조사)
    const newStockLimit = getSkuStock(colorName, sizeName)
    if (newStockLimit === 0) {
      showToastNotification('⚠️ 품절된 옵션입니다. 다른 옵션을 선택해 주세요.', 'warning')
      return
    }
    // 신규 행 추가 — 초기 수량은 항상 1 (minOrder 절대 사용하지 않음)
    selectedSkus.value.push({
      color: colorName,
      size: sizeName,
      specId: getSkuSpecId(colorName, sizeName),
      // 이 줄의 단가를 담는 시점에 확정 — 이후 다른 옵션 선택에 영향받지 않는다
      unitPriceCny: resolveRowUnitPrice(colorName, sizeName),
      quantity: 1
    })
  }
}

// 개별 SKU 행 수량 조절 — 오직 idx번째 행의 quantity만 독립 변경
const updateSkuQty = (idx, delta) => {
  const sku = selectedSkus.value[idx]
  if (!sku) return
  const current = Number(sku.quantity) || 1
  // 행 하한은 1. MOQ는 옵션 합계로만 판정하므로 개별 행에서 막지 않는다.
  // (기존 Math.max(mo, …)는 수량 1인 행에서 － 를 누르면 2로 역증가하는 버그가 있었음)
  if (delta < 0 && current <= 1) return
  const next = Math.max(1, current + delta)
  // 증가 방향일 때만 재고 상한 체크
  if (delta > 0) {
    const stockLimit = getSkuStock(sku.color, sku.size)
    if (next > stockLimit) {
      showToastNotification(`⚠️ 재고는 최대 ${stockLimit}개까지만 담을 수 있습니다.`, 'warning')
      selectedSkus.value[idx] = { ...sku, quantity: stockLimit }
      return
    }
  }
  // 반드시 해당 행 객체의 quantity만 수정 (다른 인덱스 행 절대 건드리지 않음)
  selectedSkus.value[idx] = { ...sku, quantity: next }
}

// 직접 입력 시 재고 상한 클램핑
const onSkuQtyInput = (idx, e) => {
  const sku = selectedSkus.value[idx]
  if (!sku) return
  // 행 하한은 1 (MOQ는 담기 시점에 합계로 판정).
  // 기존 `if (val < mo)` 분기는 바로 윗줄 Math.max(mo, …) 때문에 도달 불가능한 죽은 코드였음.
  const val = Math.max(1, parseInt(e.target.value, 10) || 1)
  const stockLimit = getSkuStock(sku.color, sku.size)
  if (stockLimit !== Infinity && val > stockLimit) {
    showToastNotification(`⚠️ 재고는 최대 ${stockLimit}개까지만 담을 수 있습니다.`, 'warning')
    selectedSkus.value[idx] = { ...sku, quantity: stockLimit }
    e.target.value = stockLimit
    return
  }
  selectedSkus.value[idx] = { ...sku, quantity: val }
}

const removeSku = (idx) => {
  selectedSkus.value.splice(idx, 1)
}

// ----------------------------------------------------
// Detail Images Loader
// ----------------------------------------------------
const normalizeImgUrl = (url) => {
  if (!url || typeof url !== 'string') return ''
  let cleaned = url.trim()
  if (cleaned.startsWith('//')) {
    cleaned = 'https:' + cleaned
  }
  return cleaned
}

const loadProductDetailImages = async (item) => {
  if (!item?.id) return
  isLoadingDetail.value = true
  detailImages.value = []

  // ── URL 정규화 헬퍼 ──────────────────────────────────────────────────────
  const normalizeOne = (u) => {
    if (!u || typeof u !== 'string') return ''
    let s = u.trim()
    // 프로토콜 없는 // 형태 URL 자동 보완 (alicdn.com 등)
    if (s.startsWith('//')) s = 'https:' + s
    if (s.startsWith('http://')) s = s.replace('http://', 'https://')
    if (s.startsWith('data:') || s.length < 20) return ''  // base64/빈 데이터 차단
    return s.startsWith('https://') ? s : ''
  }

  const BLOCKED = ['images.unsplash.com', 'picsum.photos']
  const isBlocked = (u) => BLOCKED.some(d => u.includes(d))

  // ── 다중 소스에서 URL 목록 추출 (배열/쉼표문자열/HTML/단일URL) ───────────
  const extractUrls = (src) => {
    if (!src) return []
    const results = []
    const seen = new Set()
    const add = (raw) => {
      const u = normalizeOne(typeof raw === 'object' ? (raw.url || raw.src || raw.Url || '') : String(raw || ''))
      if (u && !seen.has(u) && !isBlocked(u)) { seen.add(u); results.push(u) }
    }
    if (typeof src === 'string') {
      if (src.includes('<img')) {
        // HTML img 태그 파싱 (src 및 data-src)
        ;[...src.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].forEach(m => add(m[1]))
        ;[...src.matchAll(/<img[^>]+data-src=["']([^"']+)["']/gi)].forEach(m => add(m[1]))
      } else if (src.includes(',')) {
        // 쉼표 구분 URL 목록 (http:// 또는 // 형태 모두 지원)
        src.split(',').map(s => s.trim()).filter(Boolean).forEach(add)
      } else {
        add(src)
      }
    } else if (Array.isArray(src)) {
      src.forEach(add)
    }
    return results
  }


  const itemId = String(item.id || '').replace(/[^0-9]/g, '') || String(item.id || '')

  try {
    // ── getItemDetail1688는 in-flight 공유 맵으로 보호됨:
    //    loadFullProductData와 동시에 호출되어도 API는 단 1회만 실행됨
    console.log('[loadProductDetailImages] Reusing shared getItemDetail1688 for id:', itemId)
    const rawData = await getItemDetail1688(itemId)

    // OneBound 응답에서 item 객체 추출
    let it = null
    if (rawData && (rawData.num_iid || rawData.title || rawData.pic_url || rawData.item_imgs || rawData.desc_img || rawData.desc)) {
      it = rawData
    } else if (rawData?.item) {
      it = rawData.item
    } else if (rawData?.result?.item) {
      it = rawData.result.item
    } else {
      it = rawData || {}
    }

    console.log('[loadProductDetailImages] item keys:', Object.keys(it || {}).slice(0, 12))

    let imgs = []

    // ── 1순위: desc_img (OneBound 본문 상세 설명 이미지, 최우선) ──────────────
    if (it.desc_img) {
      imgs = extractUrls(it.desc_img)
      if (imgs.length) console.log(`[loadProductDetailImages] desc_img → ${imgs.length}장`)
    }

    // ── 2순위: desc HTML 파싱 ────────────────────────────────────────────────
    if (!imgs.length && it.desc) {
      imgs = extractUrls(it.desc)
      if (imgs.length) console.log(`[loadProductDetailImages] desc HTML → ${imgs.length}장`)
    }

    // ── 3순위: description / detail_html 필드 ───────────────────────────────
    if (!imgs.length && (it.description || it.detail_html)) {
      imgs = extractUrls(it.description || it.detail_html)
      if (imgs.length) console.log(`[loadProductDetailImages] description HTML → ${imgs.length}장`)
    }

    // ── 4순위: item_imgs (갤러리 이미지) ─────────────────────────────────────
    if (!imgs.length && Array.isArray(it.item_imgs) && it.item_imgs.length > 0) {
      imgs = extractUrls(it.item_imgs)
      if (imgs.length) console.log(`[loadProductDetailImages] item_imgs → ${imgs.length}장`)
    }

    // ── 5순위: currentItem.descImgs ─────────────────────────────────────────
    if (!imgs.length) {
      const candidate = currentItem.value || item || props.product || {}
      if (Array.isArray(candidate.descImgs) && candidate.descImgs.length > 0) {
        imgs = candidate.descImgs.filter(u => u && !isBlocked(u))
        if (imgs.length) console.log(`[loadProductDetailImages] currentItem.descImgs → ${imgs.length}장`)
      }
    }

    // ── 6순위: currentItem.images / props.product.images ─────────────────────
    if (!imgs.length) {
      const candidate = currentItem.value || item || props.product || {}
      const fallbackList = Array.isArray(candidate.images) && candidate.images.length > 0
        ? candidate.images
        : (Array.isArray(props.product?.images) && props.product.images.length > 0 ? props.product.images : [])
      if (fallbackList.length > 0) {
        imgs = fallbackList.map(u => normalizeOne(u)).filter(u => u && !isBlocked(u))
        if (imgs.length) console.log(`[loadProductDetailImages] fallback images → ${imgs.length}장`)
      }
    }

    // ── 7순위: 메인 대표 이미지 ──────────────────────────────────────────────
    if (!imgs.length) {
      const candidate = currentItem.value || item || props.product || {}
      const mainImg = normalizeOne(candidate.imageUrl || candidate.image || props.product?.imageUrl || '')
      if (mainImg && !isBlocked(mainImg)) {
        imgs = [mainImg]
        console.log('[loadProductDetailImages] main image fallback → 1장')
      }
    }

    console.log('[loadProductDetailImages] Final image count:', imgs.length)
    if (imgs.length > 0) {
      detailImages.value = imgs
    }
  } catch (err) {
    console.warn('[loadProductDetailImages] error:', err.message)
  } finally {
    isLoadingDetail.value = false
  }
}


const handleDetailImageError = (idx) => {
  if (detailImages.value[idx]) {
    detailImages.value.splice(idx, 1)
  }
}

// ----------------------------------------------------
// Similar Products Loader (카테고리 유사 상품 추천)
// 1순위: titleZh 키워드(뒤 3글자) + categoryId 검색 (실측 약 1.5초)
//        · categoryId가 있으면 같은 카테고리로 좁힌다 — 정확도의 주 방어선
//        · categoryId가 없는 상품은 키워드만으로 검색 (기존과 동일)
// 2순위(fallback): 대표 이미지 URL로 image search (실측 3.9~5.2초)
//
// 순서 근거: 유사 상품은 장식 성격이라 정확도보다 속도가 우선이라는 결정.
// 이미지검색이 카테고리 정확도는 더 높지만 2~3배 느려 뒤로 뺀다.
// ----------------------------------------------------
// 화면에 표시할 유사 상품 개수. 요청/번역은 자기 자신 1건이 섞여 들어올 수 있어 +1건으로 받는다.
const SIMILAR_LIMIT = 6
const SIMILAR_FETCH = SIMILAR_LIMIT + 1

const loadSimilarProducts = async (item) => {
  if (!item) return
  isLoadingSellerProducts.value = true
  sellerProducts.value = []

  const currentId = String(item.id || '')

  // 헬퍼: 자기 자신 제외 + 최대 SIMILAR_LIMIT개
  const filterResults = (items) =>
    (items || []).filter(p => String(p.id || '') !== currentId).slice(0, SIMILAR_LIMIT)

  try {
    // ─── 1순위: titleZh 키워드 검색 (+ 같은 카테고리로 좁히기) ────────────
    // 키워드는 titleZh(없으면 title)에서 영문/숫자/괄호를 걷어낸 뒤 한자 "뒤에서 3글자".
    //
    // ★ 왜 앞이 아니라 뒤인가 — 2026-09-23 실측:
    //   1688 제목은 관례적으로 판촉 수식어로 시작하고 품목어가 뒤에 온다.
    //   "厂家直销三折10骨黑胶伞常规加粗雨伞防晒防紫外线太阳伞"(우산)에서
    //   앞 4글자는 "厂家直销"(공장직판)가 뽑혀, 검색 결과가 라면·커피·미역국이 됐다.
    //   뒤 3글자는 "太阳伞"(양산)이 뽑혀 상위 6건이 전부 우산이었다.
    //   불용어 목록 방식은 채택하지 않았다 — 수식어 종류가 끝없이 늘어 재발한다.
    //
    // 한자가 3글자 미만이면 첫 토큰 앞 8글자를 쓴다. (기존 폴백 동작 그대로 유지)
    const titleZh = String(item.titleZh || item.title || '').trim()
    const hanziOnly = titleZh.replace(/[a-zA-Z0-9\s\-_.()（）【】]/g, ' ').trim()
    const hanziJoined = hanziOnly.replace(/\s+/g, '')
    const keyword = !titleZh
      ? ''
      : (hanziJoined.length >= 3
          ? hanziJoined.slice(-3)
          : titleZh.trim().split(/[\s\-_]/)[0].slice(0, 8))

    // 같은 카테고리로 좁힌다 — 이쪽이 주 방어선이다.
    // categoryId는 상세(item_get)의 cid에서 온다(api1688.js normalizedProduct).
    // 없는 상품은 키워드만으로 검색한다(기존과 동일 동작).
    const categoryId = String(item.categoryId || '').replace(/[^0-9]/g, '')

    if (keyword && keyword.length >= 2) {
      try {
        console.log(
          `[loadSimilarProducts] 키워드검색: keyword="${keyword}" ` +
          `categoryId="${categoryId || '(없음 — 키워드만으로 검색)'}" (titleZh="${titleZh.slice(0, 30)}...")`
        )
        // maxItems: search1688이 번역 전에 상위 N건으로 자른다 (불필요한 번역 방지).
        // OneBound item_search는 페이지 크기 지정을 지원하지 않아 응답은 전량 받고,
        // 번역 직전에 잘리는 구조다.
        const kwResult = await search1688WithTranslation(keyword, 1, {
          maxItems: SIMILAR_FETCH,
          ...(categoryId ? { cat: categoryId } : {}),
        })
        const filtered = filterResults(kwResult?.items)
        if (filtered.length > 0) {
          sellerProducts.value = filtered
          return  // 성공 → 이미지검색 불필요
        }
        console.warn('[loadSimilarProducts] Keyword search returned no results, falling back to image search')
      } catch (kwErr) {
        // 증상 은폐 없이 로그 후 폴백
        console.warn('[loadSimilarProducts] Keyword search failed:', kwErr.message, '→ falling back to image search')
      }
    } else {
      console.warn('[loadSimilarProducts] No usable keyword from title, falling back to image search')
    }

    // ─── 2순위 fallback: 대표 이미지 URL로 이미지 검색 ───────────────────
    // currentItem.imageUrl은 fetch1688ProductById 완료 후 채워진 it.pic_url 기반 정규화 URL
    const imgUrl = item.imageUrl || item.images?.[0] || ''
    if (!imgUrl) return

    const imgResult = await search1688ByImageUrl(imgUrl, { maxItems: SIMILAR_FETCH })
    if (!imgResult?.success || !imgResult.items?.length) return

    const filtered = filterResults(imgResult.items)
    if (filtered.length > 0) {
      sellerProducts.value = filtered
    }
  } catch (err) {
    console.warn('[loadSimilarProducts] Unexpected error:', err.message)
  } finally {
    isLoadingSellerProducts.value = false
  }
}

// 본문을 한 번이라도 스크롤했는가 (스크롤 0인 고객에게는 호출이 나가면 안 된다)
const isModalBodyScrolled = () => {
  const el = modalBodyRef.value
  return !!el && el.scrollTop > 0
}

// 본문이 바닥 근처인가 — 센티넬을 건너뛴 경우의 보완 경로
const isModalBodyNearBottom = () => {
  const el = modalBodyRef.value
  if (!el || el.scrollTop <= 0) return false
  return (el.scrollHeight - el.scrollTop - el.clientHeight) <= SIMILAR_BOTTOM_THRESHOLD_PX
}

// 유사 상품 로드 조건 판정 — "도달했고 + 상세 로드가 끝났고 + 이 상품은 아직 안 불렀다"
// 세 지점에서 호출된다:
//   1) IntersectionObserver 콜백 (센티넬이 감지 범위에 들어온 순간)
//   2) 모달 본문 scroll 핸들러 (여유분 때문에 교차 상태가 변하지 않는 경우 + 바닥 건너뛰기 보완)
//   3) loadFullProductData 완료 시점 (이미 스크롤해 둔 상태에서 상세가 늦게 끝난 경우)
const maybeLoadSimilarProducts = () => {
  // ⚠️ 유사 상품 섹션은 상세 설명 이미지보다 위(본문 약 900px 지점)에 있어,
  //    rootMargin 600px 감지 창이 모달을 연 순간부터 이미 센티넬을 덮는다.
  //    "스크롤을 전혀 하지 않은 고객은 호출 0건"을 지키려면 스크롤 시작 여부를 함께 봐야 한다.
  const reachedBySentinel = isSimilarSentinelVisible.value && isModalBodyScrolled()
  if (!reachedBySentinel && !isModalBodyNearBottom()) return
  const item = currentItem.value
  if (!item) return
  const id = String(item.id || '')
  // 상세 로드 전에는 titleZh/imageUrl이 비어 있어 검색 품질이 떨어지므로 기다린다.
  if (!id || isDetailLoading.value) return
  if (similarLoadedForId.value === id) return

  similarLoadedForId.value = id
  loadSimilarProducts(item)
}

// 센티넬이 DOM에 붙고 떨어질 때마다 관찰을 붙였다 뗀다.
// (모달 루트가 v-if="product"라 상품이 없으면 센티넬도 사라진다)
watch(similarSentinelRef, (el) => {
  if (similarObserver) {
    similarObserver.disconnect()
    similarObserver = null
  }
  if (!el || typeof IntersectionObserver === 'undefined') return

  similarObserver = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    isSimilarSentinelVisible.value = entry.isIntersecting
    if (entry.isIntersecting) maybeLoadSimilarProducts()
  }, {
    // 스크롤 컨테이너는 모달 본문이다. null(뷰포트)로 두면 모달 내부 스크롤을 읽지 못한다.
    root: modalBodyRef.value || null,
    // 아래쪽으로만 여유를 준다 — 영역이 화면에 닿기 1스크롤 전에 미리 불러 스켈레톤을 없앤다.
    rootMargin: `0px 0px ${SIMILAR_PREFETCH_MARGIN_PX}px 0px`,
    threshold: 0
  })
  similarObserver.observe(el)
}, { flush: 'post' })

// 모달 본문 스크롤 감시 — 두 가지를 담당한다.
//   1) 감지 여유(rootMargin) 때문에 교차 상태가 더는 변하지 않을 때 조건을 다시 평가
//   2) 스크롤바를 한 번에 맨 아래로 끌어 센티넬을 지나친 경우의 바닥 근접 로드
const handleModalBodyScroll = () => {
  if (Date.now() < suppressScrollTriggerUntil) return
  maybeLoadSimilarProducts()
}

watch(modalBodyRef, (el, prevEl) => {
  if (prevEl) prevEl.removeEventListener('scroll', handleModalBodyScroll)
  if (el) el.addEventListener('scroll', handleModalBodyScroll, { passive: true })
}, { flush: 'post' })


// 비동기 상세 데이터 및 SKU 보강 로더
const loadFullProductData = async (item) => {
  if (!item?.id) {
    isDetailLoading.value = false
    return
  }
  isDetailLoading.value = true
  productLoadFailed.value = false
  try {
    console.log('[loadFullProductData] Fetching for id:', item.id)
    const full = await fetch1688ProductById(item.id)
    console.log('[loadFullProductData] Full response skuProps:', full?.skuProps, '| skus:', full?.skus?.length)
    const isStillActiveItem = currentItem.value && String(currentItem.value.id) === String(item.id)
    if (full && isStillActiveItem) {

      // 1. 가격 보존 가드: full.price가 유효(> 0)할 때만 적용, 아니면 기존 item/props.product 가격 보존
      const rawPrice = (typeof full.price === 'number' && full.price > 0)
        ? full.price
        : (Number(currentItem.value.price || item.price || props.product?.price) || 0)

      const mergedSkuProps = (Array.isArray(full.skuProps) && full.skuProps.length > 0)
        ? full.skuProps
        : (currentItem.value.skuProps || item.skuProps || props.product?.skuProps || [])

      const mergedSkus = (Array.isArray(full.skus) && full.skus.length > 0)
        ? full.skus
        : (currentItem.value.skus || item.skus || props.product?.skus || [])

      console.log('[loadFullProductData] mergedSkuProps:', mergedSkuProps)

      // images 보호 merge: full.images가 비어있으면 기존 images 보존
      const mergedImages = (Array.isArray(full.images) && full.images.length > 0)
        ? full.images
        : (Array.isArray(currentItem.value.images) && currentItem.value.images.length > 0
            ? currentItem.value.images
            : (Array.isArray(item.images) && item.images.length > 0 ? item.images : []))

      // imageUrl 보호 merge: full.imageUrl이 없으면 기존 값 보존
      const mergedImageUrl = full.imageUrl || currentItem.value.imageUrl || item.imageUrl || ''

      // 제목 보호 merge: 상세 응답의 titleKo에 한글이 없으면(= 번역이 안 된 것) 덮어쓰지 않는다.
      // `...full`이 그대로 퍼지면 목록에서 이미 한글로 받아 둔 제목이 중국어로 되돌아간다.
      // 판정은 api1688.js의 hasHangul 하나만 쓴다(MallRecentlyViewed·OrderedProductsPanel과 같은 규칙).
      const koCandidates = [full.titleKo, full.title, currentItem.value.titleKo, item.titleKo, props.product?.titleKo]
      const mergedTitleKo = koCandidates.find(t => hasHangul(t)) || full.titleKo || currentItem.value.titleKo || ''

      currentItem.value = {
        ...currentItem.value,
        ...full,
        price: rawPrice,
        priceFormatted: rawPrice > 0 ? rawPrice.toFixed(2) : (currentItem.value.priceFormatted || '0.00'),
        skuProps: mergedSkuProps,
        skus: mergedSkus,
        images: mergedImages,
        imageUrl: mergedImageUrl,
        titleKo: mergedTitleKo,
        // title도 같은 값으로 맞춘다 — displayProductTitle이 titleKo → title 순으로 읽는다(852행)
        title: mergedTitleKo || full.title || currentItem.value.title || ''
      }

      // ── freight 배경 자동 호출 제거 (2026-09-15) ─────────────────────────────
      // 이유: 상세 진입만 해도 freight-estimate API가 나가는 불필요한 호출이었음.
      // 운임은 CartView에서 담기 후 seller 그룹 단위 배치 호출(fetch1688FreightEstimateBatch)로만 계산.
      // item.freight는 담기 시점에 currentItem.value.freight(null 또는 api1688.js가 item_get에서 파싱한 값)으로 저장됨.

    } else if (!full && isStillActiveItem) {
      // item_get 실패(타임아웃/4013 등) — currentItem.value는 검색결과의 빈약한 데이터(sellerId 미포함) 그대로.
      // 이 상태로 담기가 되면 orders.items에 sellerId="" 로 저장되는 버그로 이어지므로 차단 플래그를 세운다.
      console.warn('[loadFullProductData] fetch1688ProductById 실패 — productLoadFailed=true, id:', item.id)
      productLoadFailed.value = true
    }
  } catch (err) {
    console.debug('Failed to load full product details:', err)
    if (currentItem.value && String(currentItem.value.id) === String(item.id)) {
      productLoadFailed.value = true
    }
  } finally {
    // 성공/실패 무관하게 반드시 스켈레톤 해제
    isDetailLoading.value = false


    // ── 비동기 상세 로드 완료 후 조건부 기본 선택 처리 ──
    const realColors = colorOptions.value.filter(c => c.name !== '기본 단품')
    const hasProps = (Array.isArray(currentItem.value?.skuProps) && currentItem.value.skuProps.length > 0) ||
                     realColors.length > 0 ||
                     (Array.isArray(sizeOptions.value) && sizeOptions.value.length > 0)

    if (hasProps && realColors.length > 0) {
      // 1. 옵션이 있는 상품:
      // 1차 옵션의 첫 번째 값을 selectedColor로만 활성화하고, selectedSkus는 사용자가 1차/2차 옵션을 선택하기 전까지 빈 상태 유지
      selectedColor.value = realColors[0]
      selectedColorId.value = realColors[0]?.colorId ?? null
      selectedSize.value = null
      selectedSkus.value = []
    } else if (!hasProps && colorOptions.value.length > 0) {
      // 2. 진짜 단품 상품 (skuProps가 아예 없는 단일 규격 상품):
      // 로딩이 완전히 끝난 시점에만 1차 옵션 '기본 단품' 1개를 표시하고 기본 수량(1개) 품목 등록
      selectedColor.value = colorOptions.value[0]
      selectedColorId.value = colorOptions.value[0]?.colorId ?? null
      selectedSize.value = null
      selectedSkus.value = [
        {
          color: selectedColor.value.name || '기본 단품',
          size: '',
          unitPriceCny: resolveRowUnitPrice(selectedColor.value.name || '', ''),
          quantity: 1
        }
      ]
    } else {
      selectedColor.value = null
      selectedColorId.value = null
      selectedSize.value = null
      selectedSkus.value = []
    }

    checkStoreFavorite()

    // ── 상세 API 완료 후 titleZh가 채워진 currentItem 기준으로 유사 상품 "조건부" 로드 ──
    // 모달을 열자마자 부르지 않는다. 사용자가 유사 상품 영역까지 스크롤해 둔 경우에만 실행된다.
    maybeLoadSimilarProducts()

  }
}

// 다른 상품 클릭 시 모달 내에서 즉시 상품 전환
const selectAnotherProduct = (newProduct) => {
  currentItem.value = JSON.parse(JSON.stringify(newProduct))
  activeImage.value = newProduct.imageUrl || ''
  selectedColor.value = null
  selectedColorId.value = null
  selectedSize.value = null
  selectedSkus.value = []
  checkStoreFavorite()
  checkSavedProduct()

  // 새 상품 기준으로 유사 상품을 "다시 1회" 부를 수 있도록 초기화.
  // 실제 호출은 사용자가 유사 상품 영역까지 다시 스크롤했을 때만 일어난다.
  similarLoadedForId.value = ''
  sellerProducts.value = []

  // 상단으로 부드럽게 스크롤
  // 이 프로그램 스크롤(약 0.5초)이 사용자의 스크롤로 오인돼 새 상품의 유사 상품을
  // 곧바로 불러오지 않도록, 스크롤 트리거를 잠시 무시한다.
  suppressScrollTriggerUntil = Date.now() + 1200
  if (modalBodyRef.value) {
    modalBodyRef.value.scrollTo({ top: 0, behavior: 'smooth' })
  }

  loadFullProductData(newProduct)
  loadProductDetailImages(newProduct)
  // loadSellerProducts는 loadFullProductData finally 완료 후 sellerId가 채워진
  // currentItem.value를 기준으로 자동 호출됨 (중복 호출 방지)
  emit('change-product', newProduct)
}

// ----------------------------------------------------
// Modal Actions & Toast Notification
// ----------------------------------------------------
const toastMessage = ref('')
const toastType = ref('success') // 'success' | 'warning' | 'info'
const toastLink = ref(false)     // true면 토스트에 '보러가기'(내상품리스트) 버튼 노출
let toastTimer = null

const showToastNotification = (msg, type = 'success', withLink = false) => {
  toastMessage.value = msg
  toastType.value = type
  toastLink.value = withLink
  if (toastTimer) clearTimeout(toastTimer)
  // 경고/실패는 문장이 길어 읽는 데 시간이 더 필요하므로 6초, 성공은 3초
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
    toastLink.value = false
  }, type === 'warning' ? 6000 : 3000)
}

// ----------------------------------------------------
// 내상품리스트(찜) 토글 — saved_products
// ----------------------------------------------------
const savedProductRowId = ref(null)
const isSavedProductBusy = ref(false)
const isProductSaved = computed(() => Boolean(savedProductRowId.value))

// 1688 offerId — recently_viewed / 장바구니 itemId와 동일 기준
const currentItemId = computed(() =>
  String(currentItem.value?.id || props.product?.id || '')
)

const checkSavedProduct = async () => {
  savedProductRowId.value = null
  if (!isLoggedIn.value || !currentItemId.value) return
  try {
    const row = await findSavedProduct(currentItemId.value)
    savedProductRowId.value = row?.id || null
  } catch (err) {
    // 조회 실패 시 빈 별로 표시하되 원인은 반드시 남긴다 (토글 시 에러 토스트로 재노출됨)
    console.error('[ProductDetailModal] 찜 상태 조회 실패:', err.message)
  }
}

// 카드 표시 + 모달 재오픈에 필요한 최소 정보만 저장 (1688 원본 응답 전체 저장 금지)
const buildSavedItemData = () => {
  const item = currentItem.value || props.product || {}
  const images = galleryImages.value.slice(0, 5)
  return {
    itemId: currentItemId.value,
    titleKo: displayProductTitle.value,
    titleZh: item.titleZh || item.title || '',
    imageUrl: activeImage.value || item.imageUrl || images[0] || '',
    images,
    priceTiers: displayedPriceTiers.value.map(t => ({
      label: t.label,
      minQuantity: t.minQuantity,
      maxQuantity: t.maxQuantity,
      price: t.price
    })),
    minOrder: minOrder.value,
    sellerName: item.company || item.sellerName || '',
    productUrl: original1688Url.value
  }
}

// '보러가기' → 내상품리스트로 이동 (handleGoToCart와 동일한 history 처리 패턴)
const goToSavedProductList = () => {
  toastMessage.value = ''
  toastLink.value = false
  if (typeof window !== 'undefined') {
    if (window.history.state?.modal === 'product-detail') {
      window.history.replaceState(null, '')
    }
    document.body.style.overflow = 'unset'
  }
  emit('close')
  router.push('/dashboard/sourcing-products')
}

const toggleSavedProduct = async () => {
  if (isSavedProductBusy.value) return

  if (!isLoggedIn.value) {
    showToastNotification('⚠️ 로그인이 필요한 기능입니다.', 'warning')
    openLoginModal('login')
    return
  }
  if (!currentItemId.value) {
    showToastNotification('⚠️ 상품 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.', 'warning')
    return
  }

  // 관리자 세션(Supabase JWT 없음)은 RLS로 거부되므로 DB 호출 전에 안내하고 중단.
  // (savedProducts의 쓰기 함수에도 동일 가드가 있어 이중 방어)
  if (!(await hasSupabaseSession())) {
    showToastNotification(`⚠️ ${ADMIN_SESSION_MESSAGE}`, 'warning')
    return
  }

  isSavedProductBusy.value = true
  try {
    if (savedProductRowId.value) {
      await removeSavedProduct(currentItemId.value)
      savedProductRowId.value = null
      showToastNotification('내상품리스트에서 뺐어요', 'info')
    } else {
      // 카테고리 자동 지정: 진입 경로가 대분류/소분류일 때만 값이 넘어온다.
      let categoryId = null
      if (props.autoCategoryName) {
        try {
          categoryId = await resolveMajorCategoryId(props.autoCategoryName)
        } catch (catErr) {
          // 카테고리 조회 실패는 찜 자체를 막지 않고 '미분류'로 저장 (원인은 로그로 남김)
          console.error('[ProductDetailModal] 대분류 매핑 실패 — 미분류로 저장합니다:', catErr.message)
        }
      }

      const saved = await saveProduct({
        itemId: currentItemId.value,
        titleZh: currentItem.value?.titleZh || currentItem.value?.title || '',
        imageUrl: activeImage.value || currentItem.value?.imageUrl || '',
        // 찜 카드에 표시할 대표 단가. 수량 구간 상품은 현재 수량의 구간 단가,
        // SKU별 가격 상품은 옵션 최저가(선택에 따라 흔들리지 않는 고정값)다.
        // ※ 장바구니 priceCny는 줄마다 자기 SKU 단가라 이 값과 다를 수 있다.
        snapshotPrice: Number(currentUnitRmb.value),
        itemData: buildSavedItemData(),
        categoryId
      })
      savedProductRowId.value = saved.id
      showToastNotification('내상품리스트에 담았어요', 'success', true)
    }
  } catch (err) {
    console.error('[ProductDetailModal] 찜 처리 실패:', err)
    showToastNotification(`⚠️ ${err.message}`, 'warning')
    // 실패 원인이 중복(이미 담김)일 수 있으므로 실제 상태를 다시 맞춘다
    checkSavedProduct()
  } finally {
    isSavedProductBusy.value = false
  }
}

const handleClose = () => {
  isCartConfirmModalOpen.value = false
  selectedColor.value = null
  selectedColorId.value = null
  selectedSize.value = null
  selectedSkus.value = []
  if (typeof window !== 'undefined') {
    if (window.history.state?.modal === 'product-detail') {
      window.history.back()
    }
    document.body.style.overflow = 'unset'
  }
  emit('close')
}

const handlePopState = (e) => {
  if (props.product) {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'unset'
    }
    emit('close')
  }
}

// ── 공통 장바구니 저장 헬퍼 ──
// 각 SKU(색상+사이즈+수량 조합)를 독립적인 별도 행으로 저장하여 옵션 혼재 방지
const saveSelectedItemsToCart = () => {
  // 0. 상품 상세 정보(item_get) 로드 실패 가드 — sellerId 등 필수 정보가 검색결과의
  //    빈약한 데이터 그대로일 수 있으므로 담기를 막고 재시도한다.
  if (productLoadFailed.value) {
    showToastNotification('⚠️ 상품 정보를 불러오지 못했습니다. 다시 시도해주세요.', 'warning')
    if (currentItem.value) loadFullProductData(currentItem.value)
    return null
  }

  // 1. 발주 품목 검증 가드 (미선택 시 차단)
  if (!selectedSkus.value.length || totalQuantity.value === 0) {
    if (hasMultipleOptions.value && selectedColor.value && !selectedSize.value) {
      showToastNotification(`⚠️ 2차 옵션(${secondPropName.value})을 마저 선택해 주세요.`, 'warning')
    } else {
      showToastNotification('⚠️ 옵션을 모두 선택한 후 담아주세요.', 'warning')
    }
    return null
  }

  if (!currentItem.value) return null

  try {
    const cartKey = getCartStorageKey()
    const cart = readCart(cartKey)

    const baseItem = {
      itemId: currentItem.value.id,
      titleKo: currentItem.value.titleKo || currentItem.value.titleZh,
      titleZh: currentItem.value.titleZh,
      imageUrl: activeImage.value || currentItem.value.imageUrl,
      detailUrl: currentItem.value.detailUrl,
      company: currentItem.value.company || '1688 공급처',
      // ── seller 정보 보존 (OrderConfigModal items 매핑까지 흘러가야 함) ──
      sellerId: currentItem.value.sellerId || currentItem.value.memberId || currentItem.value.shopId || '',
      sellerName: currentItem.value.company || currentItem.value.sellerName || '1688 공급처',
      // ── 중국 현지 운임 (fetch1688ProductById 파싱값, 包邮=0 포함) ──
      // null: API에서 운임 정보 없음(구 데이터 등) → 관리자 모달에서 수량기반 추정치로 폴백
      // 0: 包邮(무료배송) 확인됨 → 관리자 모달에서 ₩0으로 표시
      freight: currentItem.value.freight ?? null,
    }

    // 2. 최소 주문 수량(min_num) 검증 가드 — 같은 1688 상품(offerId) "합계" 기준.
    //    판정 로직은 utils/cartWriter.js의 checkOfferMoq 공용 함수로 이동(엑셀 대량발주와 공유).
    //    문구·차단 시점은 기존과 동일 — 메시지는 결과 객체에서 받아 그대로 띄운다.
    const moqResult = checkOfferMoq({
      cart,
      offerId: currentItem.value.id,
      addingQty: totalQuantity.value,
      minOrder: currentItem.value.minOrder,
    })
    const mo = moqResult.moq
    if (!moqResult.ok) {
      showToastNotification(moqResult.message, moqResult.messageType)
      return null
    }

    // 3. 옵션 미선택 / 옵션 파싱 실패 가드 ────────────────────────────────
    //    raw(OneBound 원본)에 옵션이 있는데 파싱 결과가 비면 colorOptions가
    //    '기본 단품' 폴백(colorOptions의 마지막 Fallback 분기)으로 떨어져 옵션 없이 담긴다.
    //    이때 응답 자체는 성공이라 productLoadFailed가 false여서 기존 가드로는 잡히지 않았다.
    //    raw 구조 판정 기준은 api1688.js fetch1688ProductById의 rawSkus 추출부와 동일하게 맞춘다.
    const rawItem = currentItem.value.raw || {}
    const rawPropsList = rawItem.props_list || rawItem.sku_props || null
    const rawSkuArr =
      (rawItem.skus && Array.isArray(rawItem.skus.sku)) ? rawItem.skus.sku
      : Array.isArray(rawItem.skus) ? rawItem.skus
      : (rawItem.sku && Array.isArray(rawItem.sku.sku)) ? rawItem.sku.sku
      : (rawItem.sku && Array.isArray(rawItem.sku)) ? rawItem.sku
      : []
    const rawHasOptions =
      (rawPropsList && typeof rawPropsList === 'object' && !Array.isArray(rawPropsList)
        && Object.keys(rawPropsList).length > 0) ||
      rawSkuArr.length > 0
    const parsedHasOptions =
      (Array.isArray(currentItem.value.skuProps) && currentItem.value.skuProps.length > 0) ||
      (Array.isArray(currentItem.value.skus) && currentItem.value.skus.length > 0)

    if (rawHasOptions && !parsedHasOptions) {
      showToastNotification('⚠️ 상품 옵션 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', 'warning')
      loadFullProductData(currentItem.value)
      return null
    }
    //    두 번째 조건은 "화면에 실제 선택 가능한 옵션이 있는가"로 판정한다.
    //    1688이 무SKU 단품에도 색상명 없는 skus 1개를 주는 경우가 있어
    //    parsedHasOptions만으로는 진짜 단품을 오차단한다. 기준은 아래 realColorOptions와 동일.
    const realColorOptions = colorOptions.value.filter(c => c.name !== '기본 단품')
    if (realColorOptions.length > 0 && selectedSkus.value.some(s => String(s.color || '').trim() === '기본 단품')) {
      showToastNotification('⚠️ 옵션을 선택해 주세요.', 'warning')
      return null
    }

    // ── SKU별 독립 행으로 분리 저장 (color+size 조합마다 별도 행) ──
    //    행 필드 구성은 utils/cartWriter.js의 buildCartRowsFromSkus로 이동(엑셀 대량발주와 공유).
    //    가격·재고·specId 조회는 이 모달의 computed를 콜백으로 넘겨 기존과 동일한 출처를 유지한다.
    const newRows = buildCartRowsFromSkus({
      baseItem,
      selectedSkus: selectedSkus.value,
      offerId: currentItem.value.id,
      minOrder: mo,
      hasOptions: realColorOptions.length > 0,
      isSkuPriced: isSkuPricedProduct.value,
      priceTiers: displayedPriceTiers.value,
      exchangeRate: effectiveExchangeRate.value,
      resolveUnitPrice: rowUnitPrice,
      resolveStock: getSkuStock,
      resolveSpecId: getSkuSpecId,
      resolveImageUrl: getSkuImageUrl,
    })

    // 4. 담기 최종 방어선 — 저장 직전 행 상태 점검 (조용한 실패 금지) ────────
    //    판정 함수는 cartWriter의 순수 함수를 쓰되, 차단·문구는 이 화면 책임이다
    //    (엑셀 대량발주는 같은 함수로 확인 표에 표시할 예정).
    //    ① 재고 클램핑으로 수량이 0이 된 행 = 품절 옵션
    const zeroQtyRows = findZeroQuantityRows(newRows)
    if (zeroQtyRows.length > 0) {
      const names = [...new Set(zeroQtyRows.map(r => r.optionName || '옵션'))]
      console.error('[ProductDetailModal] 품절 옵션으로 담기 차단:', zeroQtyRows)
      showToastNotification(`⚠️ 품절된 옵션이 있습니다 — ${names.join(', ')}. 해당 옵션을 빼고 담아주세요.`, 'warning')
      return null
    }
    //    ② 단가가 유효하지 않은 행 — 0원으로 담기는 것을 원천 차단
    //       (CartView.hasValidPrice와 같은 기준. 담긴 뒤 '가격 확인 필요'로 걸리기 전에 먼저 막는다)
    const invalidPriceRows = findInvalidPriceRows(newRows)
    if (invalidPriceRows.length > 0) {
      const names = [...new Set(invalidPriceRows.map(r => r.optionName || '옵션'))]
      console.error('[ProductDetailModal] 단가 미확인 옵션으로 담기 차단:', invalidPriceRows)
      showToastNotification(`⚠️ 단가를 확인할 수 없는 옵션이 있습니다 — ${names.join(', ')}. 잠시 후 다시 시도해주세요.`, 'warning')
      return null
    }

    // ── 장바구니 기존 항목과 병합 + 저장 + 갱신 이벤트 디스패치 ──
    //    utils/cartWriter.js의 mergeAndSaveCart로 이동(엑셀 대량발주와 공유).
    mergeAndSaveCart({ cart, newRows, cartKey, exchangeRate: effectiveExchangeRate.value })

    // 대표 첫 행을 emit으로 반환 (cart-added 이벤트)
    const representativeRow = newRows[0]
    emit('added-to-cart', representativeRow)

    return representativeRow
  } catch (err) {
    console.error('Failed to add to cart:', err)
    return null
  }
}

// ── 발주대기 보관함 담기 / 옵션 변경 적용 (mode에 따라 분기) ──
const handleSaveToCart = () => {
  const saved = saveSelectedItemsToCart()
  if (saved) {
    if (props.mode === 'edit') {
      // edit 모드: confirm 팝업 없이 즉시 닫기 (CartView에서 @added-to-cart로 기존 행 교체 처리)
      handleClose()
    } else {
      // view 모드: 기존 confirm 팝업 노출
      isCartConfirmModalOpen.value = true
    }
  }
}

// 1. 계속 쇼핑하기: 팝업 닫고 상품 상세 모달도 함께 닫아 소싱몰 목록 유지
const handleContinueShopping = () => {
  isCartConfirmModalOpen.value = false
  handleClose()
}

// 2. 장바구니 바로가기: /dashboard/cart 로 즉시 이동
const handleGoToCart = () => {
  isCartConfirmModalOpen.value = false
  if (typeof window !== 'undefined') {
    if (window.history.state?.modal === 'product-detail') {
      window.history.replaceState(null, '')
    }
    document.body.style.overflow = 'unset'
  }
  emit('close')
  router.push('/dashboard/cart')
}

const handleImageFallback = (e) => {
  e.target.onerror = null
  e.target.style.display = 'none'  // 로드 실패한 이미지 숨김 (의류 Mock 사진 차단)
}

// ESC 키로 모달 닫기
const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    if (isCartConfirmModalOpen.value) {
      isCartConfirmModalOpen.value = false
    } else {
      handleClose()
    }
  }
}

// ----------------------------------------------------
// Lifecycle
// ----------------------------------------------------
watch(() => props.product, (newVal) => {
  if (newVal) {
    if (typeof window !== 'undefined') {
      if (window.history.state?.modal !== 'product-detail') {
        window.history.pushState({ modal: 'product-detail' }, '')
      }
      document.body.style.overflow = 'hidden'
    }

    isDetailLoading.value = true  // 즉시 스켈레톤 표시 (API 응답 전까지)
    currentItem.value = JSON.parse(JSON.stringify(newVal))
    activeImage.value = newVal.imageUrl || ''
    selectedColor.value = null
    selectedColorId.value = null
    selectedSize.value = null
    selectedSkus.value = []

    // 새로 연 상품은 유사 상품을 아직 안 불렀다 (호출은 스크롤 도달 시점에만)
    similarLoadedForId.value = ''
    sellerProducts.value = []
    suppressScrollTriggerUntil = 0

    checkStoreFavorite()
    checkSavedProduct()

    // loadFullProductData 내부 finally에서 isDetailLoading = false 처리
    // + 그 시점에 maybeLoadSimilarProducts()로 "스크롤 도달 여부"를 재확인
    loadFullProductData(newVal)
    loadProductDetailImages(newVal)
  } else {
    currentItem.value = null
    selectedColor.value = null
    selectedColorId.value = null
    selectedSize.value = null
    selectedSkus.value = []
    savedProductRowId.value = null
    sellerProducts.value = []
    similarLoadedForId.value = ''
    isSimilarSentinelVisible.value = false
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'unset'
    }
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('popstate', handlePopState)
  window.addEventListener('euchs:stores-updated', checkStoreFavorite)
  window.addEventListener('storage', checkStoreFavorite)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('popstate', handlePopState)
  window.removeEventListener('euchs:stores-updated', checkStoreFavorite)
  window.removeEventListener('storage', checkStoreFavorite)
  if (similarObserver) {
    similarObserver.disconnect()
    similarObserver = null
  }
  if (modalBodyRef.value) {
    modalBodyRef.value.removeEventListener('scroll', handleModalBodyScroll)
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'unset'
  }
})


</script>

<style scoped>
/* 커스텀 오렌지 스크롤바 */
.custom-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 8px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #fb923c; /* orange-400 */
  border-radius: 8px;
  border: 2px solid #f3f4f6;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #f97316; /* orange-500 */
}
</style>
