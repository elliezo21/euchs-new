<template>
  <div 
    v-if="product" 
    class="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fade-in"
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
          <span class="px-3 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black tracking-wider shadow-sm flex items-center gap-1.5">
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
              <span class="shrink-0 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[11px] font-medium rounded">1688 원문</span>
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
              <div class="flex items-center justify-between text-gray-700 border-t border-gray-200/60 pt-2">
                <span class="text-gray-500 font-medium">재구매율 / 판매량:</span>
                <span class="font-bold text-gray-900">
                  <b class="text-rose-600">{{ currentItem?.repurchaseRate || '91%' }}</b> (누적 {{ currentItem?.sales || '0' }}건)
                </span>
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
                  <i class="fas fa-tags text-rose-600"></i> 수량별 실시간 도매 단가
                </span>
                <span class="text-xs text-gray-500 font-mono">
                  적용 환율: 1 RMB = {{ exchangeRate }}원
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
                  :class="currentUnitRmb === tier.price ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/20' : 'border-rose-100'"
                >
                  <div class="text-xs text-gray-500 font-medium">{{ tier.label }}</div>
                  <div class="text-base sm:text-lg font-black text-rose-600 font-mono mt-0.5">¥ {{ tier.priceFormatted }}</div>
                  <div class="text-[11px] text-gray-400 font-mono">약 ₩{{ formatKrw(tier.priceKrw) }}</div>
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
                  <span v-if="selectedColor" class="text-rose-600 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    선택: {{ selectedColor.name }}
                  </span>
                  <span v-else class="text-gray-400 text-[11px]">
                    {{ firstPropName }}을(를) 먼저 선택하세요
                  </span>
                </div>
                <div class="flex flex-wrap gap-2.5">
                  <button
                    v-for="(color, cIdx) in colorOptions"
                    :key="color.colorId || cIdx"
                    type="button"
                    @click="handleSelectColor(color)"
                    class="px-3.5 py-2 rounded-xl border-2 text-xs font-medium transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    :class="selectedColorId === color.colorId
                      ? 'border-rose-600 bg-rose-500 text-white font-bold shadow-md ring-2 ring-rose-400/50'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'"
                  >
                    <img v-if="color.imageUrl" :src="color.imageUrl" :alt="color.name" class="w-5 h-5 rounded-full object-cover border border-white/50" referrerpolicy="no-referrer" />
                    <span>{{ color.name }}</span>
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
                  <span v-if="!selectedColor" class="text-amber-600 font-medium text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    ⚠️ 1차 {{ firstPropName }}을(를) 먼저 선택해 주세요
                  </span>
                  <span v-else class="text-gray-500 text-[11px]">
                    {{ secondPropName }}을(를) 누르면 품목에 추가됩니다
                  </span>
                </div>
                <div class="flex flex-wrap gap-2.5">
                  <button
                    v-for="(size, sIdx) in sizeOptions"
                    :key="sIdx"
                    type="button"
                    @click="handleSelectSize(size)"
                    :disabled="!selectedColor || sizeStockMap[size] === 0 || sizeStockMap[size] === undefined"
                    class="px-4 py-2 rounded-xl border-2 text-xs font-medium transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white flex flex-col items-center leading-tight"
                    :class="selectedSize === size
                      ? 'border-rose-600 bg-rose-500 text-white font-bold shadow-md ring-2 ring-rose-400/50'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'"
                  >
                    <span>{{ size }}</span>
                    <span v-if="sizeStockMap[size] === 0 || sizeStockMap[size] === undefined" class="text-[9px] text-gray-400 font-normal">품절</span>
                    <span v-else-if="typeof sizeStockMap[size] === 'number'" :class="selectedSize === size ? 'text-[9px] text-rose-200 font-normal' : 'text-[9px] text-gray-400 font-normal'">재고 {{ sizeStockMap[size] }}</span>
                  </button>
                </div>
              </div>
            </template>

            <!-- 4. Selected SKUs List & Quantity Adjuster -->
            <div class="space-y-2.5 pt-2 border-t border-gray-100">
              <div class="flex items-center justify-between text-xs font-bold text-gray-800">
                <span class="flex items-center gap-1.5">
                  <span>선택된 발주 품목</span>
                  <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-mono font-black">
                    {{ selectedSkus.length }}개
                  </span>
                </span>
                <span class="text-gray-400 font-normal text-[11px]">
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
                      개당 ¥{{ currentUnitRmb.toFixed(2) }} (약 ₩{{ formatKrw(currentUnitRmb * exchangeRate) }})
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
                      v-model.number="sku.quantity"
                      min="1"
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

            <!-- 5. Mini Cost Calculator Summary Card -->
            <div class="bg-slate-900 text-white rounded-3xl p-5 space-y-3 shadow-xl">
              <div class="flex items-center justify-between text-xs text-slate-300">
                <span>총 발주 수량:</span>
                <span class="font-bold text-white font-mono text-sm">{{ totalQuantity }} 개</span>
              </div>
              <div class="flex items-center justify-between text-xs text-slate-300">
                <span>순수 상품 원가:</span>
                <div class="text-right">
                  <span class="font-mono text-rose-400 font-bold text-sm">¥ {{ totalPriceRmb.toFixed(2) }}</span>
                  <span class="font-mono font-black text-white ml-2.5 text-base">약 ₩ {{ formatKrw(totalPriceKrw) }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between text-xs text-slate-300">
                <span>중국 내 배송비 <span class="text-slate-500 text-[10px]">(이우→창고)</span>:</span>
                <div class="text-right">
                  <span class="font-mono text-amber-400 font-bold text-sm">¥ {{ chinaFreightRmb.toFixed(2) }}</span>
                  <span class="font-mono text-slate-200 ml-2 text-sm">약 ₩ {{ formatKrw(chinaFreightKrw) }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between pt-2.5 border-t border-slate-700">
                <span class="text-xs text-slate-300">총 예상 상품 금액 <span class="text-slate-500 text-[10px]">(원가+배송비)</span>:</span>
                <div class="text-right">
                  <span class="font-mono text-rose-400 font-bold text-sm">¥ {{ (totalPriceRmb + chinaFreightRmb).toFixed(2) }}</span>
                  <span class="font-mono font-black text-amber-400 ml-2 text-base">약 ₩ {{ formatKrw(totalPriceKrw + chinaFreightKrw) }}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- ======================================================== -->
        <!-- 2. SIMILAR PRODUCTS RECOMMENDATION GRID -->
        <!-- ======================================================== -->
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
                <span class="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm text-white text-[9px] font-bold rounded">
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
                  <span class="text-[10px] text-gray-400 font-mono">₩{{ formatKrw(Number(sp.price) * exchangeRate) }}</span>
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
      <div class="sticky bottom-0 z-20 px-5 py-3.5 sm:px-8 sm:py-4 border-t border-gray-200 bg-white/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-lg">
        
        <div class="text-xs text-gray-500 hidden sm:block">
          <template v-if="selectedSkus.length > 0">
            <span class="font-bold text-gray-800">총 {{ totalQuantity }}개</span> 선택됨 (합계: <b class="text-rose-600 font-mono font-bold text-sm">₩{{ formatKrw(totalPriceKrw) }}</b>)
          </template>
          <template v-else>
            <span class="text-gray-400 font-medium">옵션을 선택하면 발주 금액이 계산됩니다.</span>
          </template>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <!-- 🛍️ 발주대기 보관함 담기 (단일 통합 메인 액션 버튼) -->
          <button
            type="button"
            @click="handleSaveToCart"
            class="w-full sm:w-auto min-w-[240px] h-12 px-8 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer text-sm sm:text-base"
          >
            <i class="fas fa-shopping-bag"></i>
            <span>발주대기 보관함 담기<template v-if="totalQuantity > 0"> ({{ totalQuantity }}개)</template></span>
          </button>
        </div>

      </div>

    </div>

    <!-- ======================================================== -->
    <!-- 5. CART CONFIRMATION POPUP MODAL -->
    <!-- ======================================================== -->
    <div 
      v-if="isCartConfirmModalOpen" 
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
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
import { getItemDetail1688, search1688WithTranslation, fetch1688ProductById, search1688ByImageUrl, cleanForeignText } from '../services/api1688'
import { getCartStorageKey } from '../lib/auth'

const props = defineProps({
  product: {
    type: Object,
    default: null
  },
  exchangeRate: {
    type: Number,
    default: 226.19
  }
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

const sellerProducts = ref([])
const isLoadingSellerProducts = ref(false)

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

const minOrder = computed(() => {
  const item = currentItem.value || props.product
  let mo = parseInt(item?.minOrder || item?.raw?.minOrder || props.product?.minOrder || props.product?.raw?.minOrder || '1', 10)
  if (isNaN(mo) || mo <= 0 || mo > 10000) {
    mo = 1
  }
  return mo
})

const displayedPriceTiers = computed(() => {
  const item = currentItem.value || props.product
  const p = basePrice.value
  const mo = minOrder.value

  // ── 1. item.priceTiers (api1688.js → fetch1688ProductById가 파싱한 1688 원본 구간) ──
  const rawTiers = item?.priceTiers || item?.raw?.priceTiers || props.product?.priceTiers || null

  if (Array.isArray(rawTiers) && rawTiers.length > 0) {
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
        priceKrw: Math.round(price * props.exchangeRate)
      }
    })
  }

  // ── 2. 원본 구간이 없으면 단일 가격 카드 1개만 (가상 할인 구간 생성 절대 금지) ──
  if (!p || p <= 0) return []

  return [
    {
      minQuantity: mo,
      maxQuantity: null,
      label: `${mo}개 이상`,
      price: Number(p.toFixed(2)),
      priceFormatted: p.toFixed(2),
      priceKrw: Math.round(p * props.exchangeRate)
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

const totalPriceRmb = computed(() => {
  return Number((totalQuantity.value * currentUnitRmb.value).toFixed(2))
})

const totalPriceKrw = computed(() => {
  return Math.round(totalPriceRmb.value * props.exchangeRate)
})

// ----------------------------------------------------
// 중국 내 배송비 추정 (이우 물류센터 기준 areaCode: 330782)
// 우선순위: 1) item.freight / item.express_fee (1688 원본) 2) 수량 스케일 기본값 (최소 ¥3.00)
// ----------------------------------------------------
const chinaFreightRmb = computed(() => {
  const qty = totalQuantity.value
  if (qty <= 0) return 0

  // 1688 원본 운임 추출 (fetch1688ProductById가 세팅한 freight 필드 우선)
  const item = currentItem.value || props.product
  const rawFreight = item?.freight ?? item?.raw?.freight ?? item?.raw?.express_fee ?? null
  const baseFreight = (rawFreight != null && rawFreight > 0)
    ? Number(rawFreight)
    : null  // 원본 없으면 null → 기본값 로직 사용

  if (baseFreight !== null) {
    // 원본 운임이 있으면 수량 비례 스케일 적용 (대량 시 합리적 배송비)
    if (qty < 10) return baseFreight
    if (qty < 50) return Number((baseFreight * 1.3).toFixed(2))
    if (qty < 100) return Number((baseFreight * 1.8).toFixed(2))
    return Number((qty * 0.10).toFixed(2))
  }

  // 원본 운임 없을 때 기본값 (기존 ¥6.00 → ¥3.00으로 하향 보정)
  if (qty < 10) return 3
  if (qty < 50) return 5
  if (qty < 100) return 8
  return Number((qty * 0.10).toFixed(2))
})


const chinaFreightKrw = computed(() => {
  return Math.round(chinaFreightRmb.value * props.exchangeRate)
})

const formatKrw = (val) => {
  return Math.round(val || 0).toLocaleString('ko-KR')
}

// ----------------------------------------------------
// Option Selection Handlers (엄격한 단계별 유효성 검사)
// ----------------------------------------------------
const handleSelectColor = (color) => {
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
      // 이미 존재하면 해당 행의 quantity만 +1 (다른 행에 절대 간섭 없음)
      existing.quantity = (Number(existing.quantity) || 1) + 1
    } else {
      // 신규 행 추가 — 초기 수량은 항상 1 (minOrder는 최소발주단위일 뿐 수량 기본값이 아님)
      selectedSkus.value.push({
        color: colorName,
        size: '',
        quantity: 1
      })
    }
  } else {
    // 2. 다중 옵션 상품일 경우: 2차 옵션 선택 대기
    selectedSize.value = null
  }
}

const handleSelectSize = (size) => {
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
    // 이미 존재하면 해당 행의 quantity만 +1 (다른 행에 절대 간섭 없음)
    existing.quantity = (Number(existing.quantity) || 1) + 1
  } else {
    // 신규 행 추가 — 초기 수량은 항상 1 (minOrder 절대 사용하지 않음)
    selectedSkus.value.push({
      color: colorName,
      size: sizeName,
      quantity: 1
    })
  }
}

// 개별 SKU 행 수량 조절 — 오직 idx번째 행의 quantity만 독립 변경
const updateSkuQty = (idx, delta) => {
  const sku = selectedSkus.value[idx]
  if (!sku) return
  const current = Number(sku.quantity) || 1
  // 반드시 해당 행 객체의 quantity만 수정 (다른 인덱스 행 절대 건드리지 않음)
  selectedSkus.value[idx] = { ...sku, quantity: Math.max(1, current + delta) }
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
// 1순위: 대표 이미지 URL로 image search (카테고리 정확도 높음)
// 2순위(fallback): titleZh 키워드 검색
// ----------------------------------------------------
const loadSimilarProducts = async (item) => {
  if (!item) return
  isLoadingSellerProducts.value = true
  sellerProducts.value = []

  const currentId = String(item.id || '')

  // 헬퍼: 자기 자신 제외 + 최대 12개
  const filterResults = (items) =>
    (items || []).filter(p => String(p.id || '') !== currentId).slice(0, 12)

  try {
    // ─── 1순위: 대표 이미지 URL로 이미지 검색 ────────────────────────────
    // currentItem.imageUrl은 fetch1688ProductById 완료 후 채워진 it.pic_url 기반 정규화 URL
    const imgUrl = item.imageUrl || item.images?.[0] || ''

    if (imgUrl) {
      try {
        const imgResult = await search1688ByImageUrl(imgUrl)
        if (imgResult?.success && imgResult.items?.length > 0) {
          const filtered = filterResults(imgResult.items)
          if (filtered.length > 0) {
            sellerProducts.value = filtered
            return  // 성공 → fallback 불필요
          }
        }
        // 이미지 검색 결과가 비어있으면 fallback으로 진행
        console.warn('[loadSimilarProducts] Image search returned no results, falling back to keyword search')
      } catch (imgErr) {
        // 이미지 검색 실패(네트워크 오류 등) → 증상 은폐 없이 로그 후 fallback
        console.warn('[loadSimilarProducts] Image search failed:', imgErr.message, '→ falling back to keyword search')
      }
    }

    // ─── 2순위 fallback: titleZh 키워드 검색 ─────────────────────────────
    const titleZh = String(item.titleZh || item.title || '').trim()
    if (!titleZh) return

    // 한자 앞 4글자 추출 (영문/숫자 제거 후)
    const hanziOnly = titleZh.replace(/[a-zA-Z0-9\s\-_.()（）【】]/g, ' ').trim()
    const keyword = hanziOnly.length >= 2
      ? hanziOnly.replace(/\s+/g, '').slice(0, 4)
      : titleZh.trim().split(/[\s\-_]/)[0].slice(0, 8)

    if (!keyword || keyword.length < 2) return

    const kwResult = await search1688WithTranslation(keyword, 1)
    if (!kwResult?.items?.length) return

    const filtered = filterResults(kwResult.items)
    if (filtered.length > 0) {
      sellerProducts.value = filtered
    }
  } catch (err) {
    console.warn('[loadSimilarProducts] Unexpected error:', err.message)
  } finally {
    isLoadingSellerProducts.value = false
  }
}


// 비동기 상세 데이터 및 SKU 보강 로더
const loadFullProductData = async (item) => {
  if (!item?.id) {
    isDetailLoading.value = false
    return
  }
  isDetailLoading.value = true
  try {
    console.log('[loadFullProductData] Fetching for id:', item.id)
    const full = await fetch1688ProductById(item.id)
    console.log('[loadFullProductData] Full response skuProps:', full?.skuProps, '| skus:', full?.skus?.length)
    if (full && currentItem.value && String(currentItem.value.id) === String(item.id)) {
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

      currentItem.value = {
        ...currentItem.value,
        ...full,
        price: rawPrice,
        priceFormatted: rawPrice > 0 ? rawPrice.toFixed(2) : (currentItem.value.priceFormatted || '0.00'),
        skuProps: mergedSkuProps,
        skus: mergedSkus,
        images: mergedImages,
        imageUrl: mergedImageUrl
      }
    }
  } catch (err) {
    console.debug('Failed to load full product details:', err)
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

    // ── 상세 API 완료 후 titleZh가 채워진 currentItem으로 유사 상품 검색 ──
    if (currentItem.value) {
      loadSimilarProducts(currentItem.value)
    }

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

  // 상단으로 부드럽게 스크롤
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
let toastTimer = null

const showToastNotification = (msg, type = 'success') => {
  toastMessage.value = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
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
    const cached = localStorage.getItem(cartKey)
    let cart = cached ? JSON.parse(cached) : []
    if (!Array.isArray(cart)) cart = []

    const baseItem = {
      itemId: currentItem.value.id,
      titleKo: currentItem.value.titleKo || currentItem.value.titleZh,
      titleZh: currentItem.value.titleZh,
      imageUrl: activeImage.value || currentItem.value.imageUrl,
      detailUrl: currentItem.value.detailUrl,
      company: currentItem.value.company || '1688 공급처',
    }

    // ── SKU별 독립 행으로 분리 저장 (color+size 조합마다 별도 행) ──
    const newRows = selectedSkus.value.map((sku, idx) => {
      const colorStr = String(sku.color || '').trim()
      const sizeStr = String(sku.size || '').trim()
      const optionParts = [colorStr, sizeStr].filter(p => p && p !== '-' && p !== 'undefined')
      const optionText = optionParts.length ? optionParts.join(' / ') : '기본 옵션'
      const skuQty = Math.max(1, Number(sku.quantity) || 1)
      const skuId = `${currentItem.value.id}_${colorStr || 'default'}_${sizeStr || 'none'}_${Date.now()}_${idx}`

      return {
        ...baseItem,
        id: skuId,
        // 옵션 독립 필드 (CartView에서 개별 렌더링용)
        color: colorStr,
        size: sizeStr,
        optionName: optionText,
        sku: optionText,
        // 수량 및 단가 (각 SKU 행 독립)
        quantity: skuQty,
        priceCny: Number(currentUnitRmb.value),
        price: Number(currentUnitRmb.value),
        totalPriceRmb: Number((skuQty * currentUnitRmb.value).toFixed(2)),
        totalPriceKrw: Math.round(skuQty * currentUnitRmb.value * props.exchangeRate),
        // 단일 SKU 스냅샷 (skus 배열도 이 행만 포함)
        skus: [{ color: colorStr, size: sizeStr, quantity: skuQty }],
        createdAt: new Date().toISOString(),
      }
    })

    // ── 장바구니 기존 항목과 병합: 동일 itemId+color+size 행은 qty 합산, 신규 옵션은 별도 행 추가 ──
    for (const newRow of newRows) {
      const existIdx = cart.findIndex(c =>
        c.itemId === newRow.itemId &&
        String(c.color || '') === newRow.color &&
        String(c.size || '') === newRow.size
      )
      if (existIdx >= 0) {
        // 동일 옵션 행 존재 → qty만 합산
        cart[existIdx].quantity = (Number(cart[existIdx].quantity) || 0) + newRow.quantity
        cart[existIdx].totalPriceRmb = Number((cart[existIdx].quantity * cart[existIdx].priceCny).toFixed(2))
        cart[existIdx].totalPriceKrw = Math.round(cart[existIdx].quantity * cart[existIdx].priceCny * props.exchangeRate)
      } else {
        // 신규 옵션 행 → 독립 행으로 선두 삽입
        cart.unshift(newRow)
      }
    }

    localStorage.setItem(cartKey, JSON.stringify(cart))

    // Storage 이벤트 및 퀵메뉴/헤더 갱신 이벤트 디스패치
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new CustomEvent('euchs:cart-updated', { detail: { count: cart.length } }))
    window.dispatchEvent(new CustomEvent('euchs:cart_updated', { detail: { count: cart.length } }))

    // 대표 첫 행을 emit으로 반환 (cart-added 이벤트)
    const representativeRow = newRows[0]
    emit('added-to-cart', representativeRow)

    return representativeRow
  } catch (err) {
    console.error('Failed to add to cart:', err)
    return null
  }
}

// ── 발주대기 보관함 담기 (단일 액션 핸들러) ──
const handleSaveToCart = () => {
  const countToSave = totalQuantity.value
  const saved = saveSelectedItemsToCart()
  if (saved) {
    // 중앙 확인 팝업 모달 즉시 노출
    isCartConfirmModalOpen.value = true
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

    checkStoreFavorite()

    // loadFullProductData 내부 finally에서 isDetailLoading = false 처리
    // + titleZh가 채워진 후 loadSimilarProducts 호출 (유사 상품 키워드 검색)
    loadFullProductData(newVal)
    loadProductDetailImages(newVal)
  } else {
    currentItem.value = null
    selectedColor.value = null
    selectedColorId.value = null
    selectedSize.value = null
    selectedSkus.value = []
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
