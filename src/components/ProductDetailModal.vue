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
        <div class="space-y-2 border-b border-gray-100 pb-5">
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-xl sm:text-2xl font-black text-gray-900 leading-snug flex-1">
              {{ currentItem?.titleKo || currentItem?.titleZh }}
            </h2>
            <!-- 1688 원본 바로가기 링크 -->
            <a
              :href="original1688Url"
              target="_blank"
              rel="noopener noreferrer"
              class="shrink-0 mt-0.5 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-[11px] font-bold hover:bg-orange-100 hover:border-orange-400 transition-colors"
              title="1688 원본 상품 페이지 새 탭으로 열기"
            >
              1688링크
              <i class="fas fa-external-link-alt text-[10px]"></i>
            </a>
          </div>
          <p class="text-xs text-gray-400 font-mono flex items-center gap-2 truncate" :title="currentItem?.titleZh">
            <span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium shrink-0">1688 원문</span>
            <span class="truncate">{{ currentItem?.titleZh }}</span>
          </p>
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
                <span class="font-bold text-gray-900 truncate max-w-[180px]" :title="currentItem?.company">
                  {{ currentItem?.company || '1688 인증 도매공장' }}
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

              <!-- Dynamic Tier Grid -->
              <div 
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
            <div v-if="isDetailLoading" class="space-y-3 py-1">
              <!-- 1차 옵션 스켈레톤 -->
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <div class="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
                  <div class="h-4 w-24 bg-slate-100 rounded animate-pulse"></div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <div v-for="n in 4" :key="n" class="h-9 w-20 bg-slate-200 rounded-xl animate-pulse"></div>
                </div>
              </div>
              <!-- 2차 옵션 스켈레톤 -->
              <div class="space-y-2 mt-1">
                <div class="flex items-center gap-2">
                  <div class="h-4 w-20 bg-slate-200 rounded animate-pulse"></div>
                  <div class="h-4 w-16 bg-slate-100 rounded animate-pulse"></div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <div v-for="n in 5" :key="n" class="h-9 w-16 bg-slate-200 rounded-xl animate-pulse"></div>
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
                    :key="cIdx"
                    type="button"
                    @click="handleSelectColor(color)"
                    class="px-3.5 py-2 rounded-xl border text-xs font-medium transition flex items-center gap-2 cursor-pointer active:scale-95"
                    :class="selectedColor?.name === color.name
                      ? 'border-rose-600 bg-rose-50 text-rose-700 font-bold shadow-sm ring-2 ring-rose-500/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'"
                  >
                    <img v-if="color.imageUrl" :src="color.imageUrl" :alt="color.name" class="w-5 h-5 rounded-full object-cover border border-gray-200" referrerpolicy="no-referrer" />
                    <span>{{ color.name }}</span>
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
                    :disabled="!selectedColor"
                    class="px-4 py-2 rounded-xl border text-xs font-medium transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                    :class="selectedSize === size
                      ? 'border-rose-600 bg-rose-50 text-rose-700 font-bold shadow-sm ring-2 ring-rose-500/20'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'"
                  >
                    {{ size }}
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
                <span>상품 원가 합계:</span>
                <div class="text-right">
                  <span class="font-mono text-rose-400 font-bold text-sm">¥ {{ totalPriceRmb.toFixed(2) }}</span>
                  <span class="font-mono font-black text-white ml-2.5 text-base">약 ₩ {{ formatKrw(totalPriceKrw) }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between text-xs text-slate-300 pt-2.5 border-t border-slate-800">
                <span>예상 대행 수수료 (8%):</span>
                <span class="font-mono text-slate-200">약 ₩ {{ formatKrw(Math.max(10000, totalPriceKrw * 0.08)) }}</span>
              </div>
            </div>

          </div>

        </div>

        <!-- ======================================================== -->
        <!-- 2. 1688 DETAIL IMAGES LIST (Vertical Continuous Rendering) -->
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

        <!-- ======================================================== -->
        <!-- 3. SAME SELLER / SUPPLIER POPULAR PRODUCTS GRID -->
        <!-- ======================================================== -->
        <div class="pt-8 border-t border-gray-100 space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <h3 class="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                <i class="fas fa-store text-blue-600"></i>
                <span>이 공급업체의 다른 인기 상품</span>
              </h3>
              <p class="text-xs text-gray-500">
                <b class="text-gray-800">{{ currentItem?.company || '동일 제조공장' }}</b>의 다른 추천 베스트셀러 상품입니다. 클릭 시 해당 상품으로 전환됩니다.
              </p>
            </div>

            <span v-if="sellerProducts.length" class="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              총 {{ sellerProducts.length }}개
            </span>
          </div>

          <!-- Loading State -->
          <div v-if="isLoadingSellerProducts" class="py-12 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
            <i class="fas fa-spinner fa-spin text-blue-500 text-xl"></i>
            <span>동일 업체의 인기 상품을 조회 중입니다...</span>
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

          <!-- Empty State -->
          <div v-else class="py-8 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl">
            이 공급업체의 추가 등록 상품이 없습니다.
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
          <!-- 1. 보관함 담기 -->
          <button
            type="button"
            @click="handleAddToCart"
            class="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs sm:text-sm border border-rose-200 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <i class="fas fa-shopping-bag"></i>
            <span>발주대기 보관함 담기</span>
          </button>

          <!-- 2. 즉시 발주서 작성 -->
          <button
            type="button"
            @click="handleInstantOrder"
            class="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/30 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i class="fas fa-bolt"></i>
            <span>즉시 발주서 작성</span>
          </button>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getItemDetail1688, search1688WithTranslation, fetch1688ProductById } from '../services/api1688'

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

// DOM Ref
const modalContainerRef = ref(null)
const modalBodyRef = ref(null)

// ----------------------------------------------------
// State
// ----------------------------------------------------
const currentItem = ref(null)
const activeImage = ref('')
const selectedColor = ref(null)
const selectedSize = ref(null)
const selectedSkus = ref([])

const detailImages = ref([])
const isLoadingDetail = ref(false)

// 상품 상세 SKU 비동기 조회 중 플래그 (true = 스켈레톤, false = 실제 옵션 렌더링)
const isDetailLoading = ref(true)

const sellerProducts = ref([])
const isLoadingSellerProducts = ref(false)

// ----------------------------------------------------
// Dynamic Options (1차 속성 & 2차 속성) & Gallery
// ----------------------------------------------------

// 1688 원본 상품 링크 (새 탭 바로가기)
const original1688Url = computed(() => {
  const item = currentItem.value || props.product || {}
  // detailUrl이 이미 유효한 URL이면 그대로 사용
  const rawUrl = item.sourceUrl || item.detailUrl || item.url || ''
  if (rawUrl && rawUrl.startsWith('http')) return rawUrl
  // itemId / offerId / num_iid / id 순으로 추출
  const pid = item.id || item.itemId || item.offerId || item.num_iid || props.product?.id || ''
  return pid ? `https://detail.1688.com/offer/${pid}.html` : 'https://www.1688.com'
})

const firstPropName = computed(() => {
  const item = currentItem.value || props.product || {}
  const raw = item.raw || {}
  const p = item.skuProps?.[0]?.prop || item.skuProps?.[0]?.propKo || item.skuProps?.[0]?.propName ||
            raw.skuProps?.[0]?.prop || raw.skuProps?.[0]?.propKo ||
            raw.sku?.skuProps?.[0]?.prop || raw.sku?.skuProps?.[0]?.propName ||
            props.product?.skuProps?.[0]?.prop || props.product?.skuProps?.[0]?.propKo
  return (p && String(p).trim()) ? String(p).trim() : '옵션'
})

const secondPropName = computed(() => {
  const item = currentItem.value || props.product || {}
  const raw = item.raw || {}
  const p = item.skuProps?.[1]?.prop || item.skuProps?.[1]?.propKo || item.skuProps?.[1]?.propName ||
            raw.skuProps?.[1]?.prop || raw.skuProps?.[1]?.propKo ||
            raw.sku?.skuProps?.[1]?.prop || raw.sku?.skuProps?.[1]?.propName ||
            props.product?.skuProps?.[1]?.prop || props.product?.skuProps?.[1]?.propKo
  return (p && String(p).trim()) ? String(p).trim() : '규격/사이즈'
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
  const mo = parseInt(item?.minOrder || item?.raw?.minOrder || props.product?.minOrder || props.product?.raw?.minOrder || '1', 10)
  return (!isNaN(mo) && mo > 0) ? mo : 1
})

const displayedPriceTiers = computed(() => {
  const item = currentItem.value || props.product
  const p = basePrice.value
  const mo = minOrder.value

  // 1. item.priceTiers 가 정의된 경우
  if (Array.isArray(item?.priceTiers) && item.priceTiers.length > 0) {
    return item.priceTiers.map((tier) => {
      const minQ = Number(tier.minQuantity || tier.min || tier.beginAmount || 1)
      const maxQ = tier.maxQuantity || tier.max || tier.endAmount ? Number(tier.maxQuantity || tier.max || tier.endAmount) : null
      const price = parseFloat(tier.price || tier.unitPrice || p) || p
      return {
        minQuantity: minQ,
        maxQuantity: maxQ,
        label: maxQ ? `${minQ}~${maxQ}개` : `${minQ}개 이상`,
        price: Number(price.toFixed(2)),
        priceFormatted: price.toFixed(2),
        priceKrw: Math.round(price * props.exchangeRate)
      }
    })
  }

  // 2. 기본 3단계 수량 할인 티어 (상품 고유 basePrice 기준 동적 계산)
  const t1Min = mo
  const t2Min = Math.max(10, mo * 5)
  const t3Min = Math.max(50, mo * 25)

  const t1Price = Number(p.toFixed(2))
  const t2Price = Number((p * 0.92).toFixed(2))
  const t3Price = Number((p * 0.85).toFixed(2))

  return [
    {
      minQuantity: t1Min,
      maxQuantity: t2Min - 1,
      label: `${t1Min}~${t2Min - 1}개`,
      price: t1Price,
      priceFormatted: t1Price.toFixed(2),
      priceKrw: Math.round(t1Price * props.exchangeRate)
    },
    {
      minQuantity: t2Min,
      maxQuantity: t3Min - 1,
      label: `${t2Min}~${t3Min - 1}개`,
      price: t2Price,
      priceFormatted: t2Price.toFixed(2),
      priceKrw: Math.round(t2Price * props.exchangeRate)
    },
    {
      minQuantity: t3Min,
      maxQuantity: null,
      label: `${t3Min}개 이상`,
      price: t3Price,
      priceFormatted: t3Price.toFixed(2),
      priceKrw: Math.round(t3Price * props.exchangeRate)
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
    const list = skuPropsArr[0].values.map(v => {
      const name = typeof v === 'string' ? v : (v.name || v.nameKo || v.nameZh || v.value || v.text || '')
      const img = typeof v === 'object' ? (v.imageUrl || v.image || v.imgUrl || v.picUrl || '') : ''
      return { name: String(name).trim(), imageUrl: img || mainImg }
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
    const list = directColors.map(c => {
      const name = typeof c === 'string' ? c : (c.name || c.nameKo || c.value || '')
      const img = typeof c === 'object' ? (c.imageUrl || c.image || '') : ''
      return { name: String(name).trim(), imageUrl: img || mainImg }
    }).filter(opt => opt.name && opt.name !== 'undefined' && opt.name !== 'null')
    if (list.length > 0) {
      console.debug('[colorOptions] Branch 2 (colors array):', list.length, 'items')
      return list
    }
  }

  // ── Branch 3: raw.skuProps[0].values
  const rawSP = raw.skuProps || raw.sku?.skuProps || raw.sku_props || props.product?.raw?.skuProps
  if (Array.isArray(rawSP) && rawSP.length > 0 && Array.isArray(rawSP[0]?.values) && rawSP[0].values.length > 0) {
    const list = rawSP[0].values.map(v => {
      const name = typeof v === 'string' ? v : (v.name || v.nameKo || v.nameZh || v.value || v.text || '')
      const img = typeof v === 'object' ? (v.imageUrl || v.image || v.imgUrl || v.picUrl || '') : ''
      return { name: String(name).trim(), imageUrl: img || mainImg }
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
      const c = s.color || s.propName || s.name || s.colorName || ''
      if (c && !seen.has(c)) seen.set(c, s.imageUrl || s.image || mainImg)
    })
    if (seen.size > 0) {
      console.debug('[colorOptions] Branch 4 (skus color):', seen.size, 'items')
      return [...seen.entries()].map(([name, imageUrl]) => ({ name: String(name).trim(), imageUrl: imageUrl || mainImg }))
    }
  }

  // ── Fallback: 단일 상품 (모든 옵션 소스가 없는 경우에만)
  console.debug('[colorOptions] Fallback: 기본 단품 (skuProps empty or not yet loaded)')
  return [{ name: '기본 단품', imageUrl: mainImg }]
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
      const name = typeof v === 'string' ? v : (v.name || v.nameKo || v.nameZh || v.value || v.text || '')
      return String(name).trim()
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
      return String(name).trim()
    }).filter(Boolean)
    if (list.length > 0) return list
  }

  // 3. raw 내부의 skuProps[1] 추출
  const rawSkuProps = raw.skuProps || raw.sku?.skuProps || raw.sku_props || props.product?.raw?.skuProps
  if (Array.isArray(rawSkuProps) && rawSkuProps.length > 1 && Array.isArray(rawSkuProps[1]?.values) && rawSkuProps[1].values.length > 0) {
    const list = rawSkuProps[1].values.map(v => {
      const name = typeof v === 'string' ? v : (v.name || v.nameKo || v.nameZh || v.value || v.text || '')
      return String(name).trim()
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

// 다중 옵션 (2차 사이즈/규격 존재 여부: 1개 이상 존재할 때만 활성화)
const hasMultipleOptions = computed(() => {
  return Array.isArray(sizeOptions.value) && sizeOptions.value.length > 0
})

// 갤러리 이미지
const galleryImages = computed(() => {
  const item = currentItem.value
  if (!item) return []
  if (Array.isArray(item.images) && item.images.length > 0) {
    return item.images
  }
  const mainImg = item.imageUrl
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

const formatKrw = (val) => {
  return Math.round(val || 0).toLocaleString('ko-KR')
}

// ----------------------------------------------------
// Option Selection Handlers (엄격한 단계별 유효성 검사)
// ----------------------------------------------------
const handleSelectColor = (color) => {
  selectedColor.value = color
  if (color.imageUrl) {
    activeImage.value = color.imageUrl
  }

  // 1. 단일 옵션 상품일 경우: 1차 선택 즉시 품목 리스트에 등록 (토스트 알림 없음)
  if (!hasMultipleOptions.value) {
    const colorName = color.name
    const existing = selectedSkus.value.find(s => s.color === colorName)
    if (existing) {
      existing.quantity += 1
    } else {
      selectedSkus.value.push({
        color: colorName,
        size: '',
        quantity: minOrder.value || 1
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
  const colorName = selectedColor.value.name
  const sizeName = size

  // 1차와 2차가 모두 선택 완료된 시점에 품목 리스트에 조용히 추가 (토스트 알림 없음)
  const existing = selectedSkus.value.find(s => s.color === colorName && s.size === sizeName)
  if (existing) {
    existing.quantity += 1
  } else {
    selectedSkus.value.push({
      color: colorName,
      size: sizeName,
      quantity: minOrder.value || 1
    })
  }
}

const updateSkuQty = (idx, delta) => {
  if (selectedSkus.value[idx]) {
    selectedSkus.value[idx].quantity = Math.max(1, selectedSkus.value[idx].quantity + delta)
  }
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
  if (!item) return
  isLoadingDetail.value = true
  detailImages.value = []

  // 1. item.raw에 이미 존재하는 이미지 확인
  const raw = item.raw || {}
  let extracted = []

  if (Array.isArray(raw.descriptionImages) && raw.descriptionImages.length > 0) {
    extracted = raw.descriptionImages
  } else if (Array.isArray(raw.detailImages) && raw.detailImages.length > 0) {
    extracted = raw.detailImages
  } else if (Array.isArray(raw.images) && raw.images.length > 0) {
    extracted = raw.images
  } else if (typeof raw.description === 'string' && raw.description.includes('<img')) {
    const matches = [...raw.description.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    extracted = matches.map(m => m[1])
  }

  if (extracted.length > 0) {
    detailImages.value = extracted.map(normalizeImgUrl).filter(Boolean)
    isLoadingDetail.value = false
    return
  }

  // 2. 비동기 1688 상세 API 호출
  try {
    const detailData = await getItemDetail1688(item.id)
    const resultItem = detailData?.result?.item || detailData?.item || detailData?.result || detailData || {}
    
    let apiImages = []
    if (Array.isArray(resultItem.descriptionImages)) {
      apiImages = resultItem.descriptionImages
    } else if (Array.isArray(resultItem.detailImages)) {
      apiImages = resultItem.detailImages
    } else if (Array.isArray(resultItem.images)) {
      apiImages = resultItem.images
    } else if (typeof resultItem.description === 'string') {
      const matches = [...resultItem.description.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
      apiImages = matches.map(m => m[1])
    }

    if (apiImages.length > 0) {
      detailImages.value = apiImages.map(normalizeImgUrl).filter(Boolean)
    } else if (item.imageUrl) {
      // Fallback 기본 썸네일
      detailImages.value = [normalizeImgUrl(item.imageUrl)]
    }
  } catch (err) {
    console.debug('Failed to fetch detail images from API:', err)
    if (item.imageUrl) {
      detailImages.value = [normalizeImgUrl(item.imageUrl)]
    }
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
// Same Seller (공급사) Other Products Loader
// ----------------------------------------------------
const loadSellerProducts = async (item) => {
  if (!item) return
  isLoadingSellerProducts.value = true
  sellerProducts.value = []

  try {
    const searchKeyword = item.company || (item.titleKo ? item.titleKo.slice(0, 8) : '인기 상품')
    const res = await search1688WithTranslation(searchKeyword, 1)
    
    if (res?.items && Array.isArray(res.items)) {
      // 현재 상품 ID 제외 후 최대 6개 선정
      sellerProducts.value = res.items
        .filter(p => String(p.id) !== String(item.id))
        .slice(0, 6)
    }
  } catch (err) {
    console.warn('Failed to load same seller products:', err)
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

      currentItem.value = {
        ...currentItem.value,
        ...full,
        price: rawPrice,
        priceFormatted: rawPrice > 0 ? rawPrice.toFixed(2) : (currentItem.value.priceFormatted || '0.00'),
        skuProps: mergedSkuProps,
        skus: mergedSkus
      }

      // currentItem 업데이트 후 colorOptions reactive 재평가 완료
      // → Vue computed는 동기적으로 재평가됨

      // 1차 옵션 선택 갱신 (실제 옵션이 있으면 첫 번째로, 기본 단품이면 null 유지)
      const firstRealOption = colorOptions.value.find(c => c.name !== '기본 단품')
      if (firstRealOption) {
        if (!selectedColor.value || selectedColor.value.name === '기본 단품' ||
            !colorOptions.value.some(c => c.name === selectedColor.value?.name)) {
          selectedColor.value = firstRealOption
        }
      } else if (colorOptions.value.length > 0 && !selectedColor.value) {
        selectedColor.value = colorOptions.value[0]
      }

      // 단일 옵션 상품: 2차 옵션이 없고 1차 옵션이 선택된 경우 자동 발주 등록
      if (!hasMultipleOptions.value && selectedColor.value) {
        const alreadyRegistered = selectedSkus.value.length > 0 &&
          selectedSkus.value[0].color === selectedColor.value.name
        if (!alreadyRegistered) {
          selectedSkus.value = [{
            color: selectedColor.value.name,
            size: '',
            quantity: Number(currentItem.value.minOrder) || 1
          }]
        }
      }
    }
  } catch (err) {
    console.debug('Failed to load full product details:', err)
  } finally {
    // 성공/실패 무관하게 반드시 스켈레톤 해제
    isDetailLoading.value = false
  }
}

// 다른 상품 클릭 시 모달 내에서 즉시 상품 전환
const selectAnotherProduct = (newProduct) => {
  currentItem.value = { ...newProduct }
  activeImage.value = newProduct.imageUrl || ''
  selectedSize.value = null
  selectedSkus.value = []

  if (colorOptions.value.length > 0) {
    selectedColor.value = colorOptions.value[0]
  } else {
    selectedColor.value = null
  }

  // 단일 옵션 상품인 경우에만 기본 1차 품목 자동 등록
  if (!hasMultipleOptions.value && selectedColor.value) {
    selectedSkus.value = [
      {
        color: selectedColor.value.name,
        size: '',
        quantity: Number(newProduct.minOrder) || 1
      }
    ]
  }

  // 상단으로 부드럽게 스크롤
  if (modalBodyRef.value) {
    modalBodyRef.value.scrollTo({ top: 0, behavior: 'smooth' })
  }

  loadFullProductData(newProduct)
  loadProductDetailImages(newProduct)
  loadSellerProducts(newProduct)
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
  emit('close')
}

const handleAddToCart = () => {
  // 1. 발주 품목 검증 가드 (미선택 시 차단)
  if (!selectedSkus.value.length || totalQuantity.value === 0) {
    if (hasMultipleOptions.value && selectedColor.value && !selectedSize.value) {
      showToastNotification(`⚠️ 2차 옵션(${secondPropName.value})을 마저 선택해 주세요.`, 'warning')
    } else {
      showToastNotification('⚠️ 옵션을 모두 선택한 후 담아주세요.', 'warning')
    }
    return
  }

  if (!currentItem.value) return

  try {
    const cached = localStorage.getItem('euchs_erp_saved_items')
    let cart = cached ? JSON.parse(cached) : []
    if (!Array.isArray(cart)) cart = []

    const itemToSave = {
      id: `${currentItem.value.id}_${Date.now()}`,
      itemId: currentItem.value.id,
      titleKo: currentItem.value.titleKo || currentItem.value.titleZh,
      titleZh: currentItem.value.titleZh,
      imageUrl: activeImage.value || currentItem.value.imageUrl,
      price: currentUnitRmb.value,
      priceCny: currentUnitRmb.value,
      quantity: totalQuantity.value,
      totalPriceRmb: totalPriceRmb.value,
      totalPriceKrw: totalPriceKrw.value,
      skus: JSON.parse(JSON.stringify(selectedSkus.value)),
      sku: selectedSkus.value.map(s => {
        const parts = [s.color, s.size].filter(p => p && p !== 'undefined' && p !== '-')
        return (parts.length ? parts.join(' / ') : '기본 옵션') + (s.quantity ? ` (${s.quantity}개)` : '')
      }).join(', '),
      detailUrl: currentItem.value.detailUrl,
      company: currentItem.value.company || '1688 공급처',
      createdAt: new Date().toISOString()
    }

    cart.unshift(itemToSave)
    localStorage.setItem('euchs_erp_saved_items', JSON.stringify(cart))

    // Storage 이벤트 및 퀵메뉴/헤더 갱신 이벤트 디스패치
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new CustomEvent('euchs:cart_updated'))
    emit('added-to-cart', itemToSave)

    // ✅ 모달 하단 버튼 클릭 시에만 정식 완료 토스트 알림 노출
    showToastNotification('✅ 선택한 상품이 발주대기 보관함(장바구니)에 담겼습니다.', 'success')
  } catch (err) {
    console.error('Failed to add to cart:', err)
  }
}

const handleInstantOrder = () => {
  if (!selectedSkus.value.length || totalQuantity.value === 0) {
    if (hasMultipleOptions.value && selectedColor.value && !selectedSize.value) {
      showToastNotification(`⚠️ 2차 옵션(${secondPropName.value})을 마저 선택해 주세요.`, 'warning')
    } else {
      showToastNotification('⚠️ 옵션을 모두 선택한 후 담아주세요.', 'warning')
    }
    return
  }

  handleAddToCart()
  handleClose()
  router.push('/dashboard/cart')
}

const handleImageFallback = (e) => {
  e.target.onerror = null
  e.target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=80'
}

// ESC 키로 모달 닫기
const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    handleClose()
  }
}

// ----------------------------------------------------
// Lifecycle
// ----------------------------------------------------
watch(() => props.product, (newVal) => {
  if (newVal) {
    isDetailLoading.value = true  // 즉시 스켈레톤 표시 (API 응답 전까지)
    currentItem.value = { ...newVal }
    activeImage.value = newVal.imageUrl || ''
    selectedColor.value = null
    selectedSize.value = null
    selectedSkus.value = []

    // loadFullProductData 내부 finally에서 isDetailLoading = false 처리
    loadFullProductData(newVal)
    loadProductDetailImages(newVal)
    loadSellerProducts(newVal)
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
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
