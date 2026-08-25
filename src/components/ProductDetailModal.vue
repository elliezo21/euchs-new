<template>
  <div 
    v-if="product" 
    class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fade-in"
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
          <h2 class="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
            {{ currentItem?.titleKo || currentItem?.titleZh }}
          </h2>
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
                <img :src="img" :alt="`thumb-${idx}`" class="w-full h-full object-cover" />
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

              <!-- 3-Tier Grid -->
              <div class="grid grid-cols-3 gap-3 pt-1">
                <!-- Tier 1 -->
                <div 
                  class="bg-white rounded-2xl p-3 text-center border transition shadow-sm"
                  :class="totalQuantity >= tier1Min && totalQuantity < tier2Min ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/20' : 'border-rose-100'"
                >
                  <div class="text-xs text-gray-500 font-medium">{{ tier1Min }}~{{ tier2Min - 1 }}개</div>
                  <div class="text-base sm:text-lg font-black text-rose-600 font-mono mt-0.5">¥ {{ tier1Price.toFixed(2) }}</div>
                  <div class="text-[11px] text-gray-400 font-mono">약 ₩{{ formatKrw(tier1Price * exchangeRate) }}</div>
                </div>

                <!-- Tier 2 -->
                <div 
                  class="bg-white rounded-2xl p-3 text-center border transition shadow-sm"
                  :class="totalQuantity >= tier2Min && totalQuantity < tier3Min ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/20' : 'border-rose-100'"
                >
                  <div class="text-xs text-gray-500 font-medium">{{ tier2Min }}~{{ tier3Min - 1 }}개</div>
                  <div class="text-base sm:text-lg font-black text-rose-600 font-mono mt-0.5">¥ {{ tier2Price.toFixed(2) }}</div>
                  <div class="text-[11px] text-gray-400 font-mono">약 ₩{{ formatKrw(tier2Price * exchangeRate) }}</div>
                </div>

                <!-- Tier 3 -->
                <div 
                  class="bg-white rounded-2xl p-3 text-center border transition shadow-sm"
                  :class="totalQuantity >= tier3Min ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-50/20' : 'border-rose-100'"
                >
                  <div class="text-xs text-gray-500 font-medium">{{ tier3Min }}개 이상</div>
                  <div class="text-base sm:text-lg font-black text-rose-600 font-mono mt-0.5">¥ {{ tier3Price.toFixed(2) }}</div>
                  <div class="text-[11px] text-gray-400 font-mono">약 ₩{{ formatKrw(tier3Price * exchangeRate) }}</div>
                </div>
              </div>
            </div>

            <!-- 2. Option Selection: Color / Style (1차 옵션) -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <label class="font-bold text-gray-800 flex items-center gap-1.5">
                  <span>1차 옵션 (색상/스타일)</span>
                  <span class="text-rose-600 font-bold">*</span>
                </label>
                <span v-if="selectedColor" class="text-rose-600 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  선택: {{ selectedColor.name }}
                </span>
                <span v-else class="text-gray-400 text-[11px]">
                  색상을 먼저 선택하세요
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
                  <img v-if="color.imageUrl" :src="color.imageUrl" :alt="color.name" class="w-5 h-5 rounded-full object-cover border border-gray-200" />
                  <span>{{ color.name }}</span>
                </button>
              </div>
            </div>

            <!-- 3. Option Selection: Size / Spec (2차 옵션 - 다중 옵션일 때만 노출) -->
            <div v-if="hasMultipleOptions" class="space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <label class="font-bold text-gray-800 flex items-center gap-1.5">
                  <span>2차 옵션 (사이즈/규격)</span>
                  <span class="text-rose-600 font-bold">*</span>
                </label>
                <span v-if="!selectedColor" class="text-amber-600 font-medium text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  ⚠️ 1차 색상을 먼저 선택해 주세요
                </span>
                <span v-else class="text-gray-500 text-[11px]">
                  사이즈를 누르면 품목에 추가됩니다
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
                      {{ sku.color }} / {{ sku.size }}
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

const sellerProducts = ref([])
const isLoadingSellerProducts = ref(false)

// ----------------------------------------------------
// Price Tiers (1688 수량별 단가 시뮬레이션)
// ----------------------------------------------------
const basePrice = computed(() => Number(currentItem.value?.price) || 20)
const minOrder = computed(() => Number(currentItem.value?.minOrder) || 1)

const tier1Min = computed(() => minOrder.value)
const tier2Min = computed(() => Math.max(10, minOrder.value * 5))
const tier3Min = computed(() => Math.max(50, minOrder.value * 25))

const tier1Price = computed(() => basePrice.value)
const tier2Price = computed(() => Number((basePrice.value * 0.92).toFixed(2)))
const tier3Price = computed(() => Number((basePrice.value * 0.85).toFixed(2)))

// 총 수량에 따른 단가 결정
const currentUnitRmb = computed(() => {
  const q = totalQuantity.value
  if (q >= tier3Min.value) return tier3Price.value
  if (q >= tier2Min.value) return tier2Price.value
  return tier1Price.value
})

// ----------------------------------------------------
// Options (Colors & Sizes) & Gallery
// ----------------------------------------------------
const colorOptions = computed(() => {
  const item = currentItem.value
  const mainImg = item?.imageUrl || ''
  
  if (Array.isArray(item?.skus) && item.skus.length > 0) {
    const uniqueColors = [...new Set(item.skus.map(s => s.color).filter(Boolean))]
    if (uniqueColors.length > 0) {
      return uniqueColors.map(c => ({
        name: c,
        imageUrl: item.skus.find(s => s.color === c)?.imageUrl || mainImg
      }))
    }
  }

  return [
    { name: '기본 (블랙/화이트)', imageUrl: mainImg },
    { name: '아이보리/베이지', imageUrl: mainImg },
    { name: '네이비/그레이', imageUrl: mainImg },
    { name: '파스텔 핑크/스카이', imageUrl: mainImg }
  ]
})

const sizeOptions = computed(() => {
  const item = currentItem.value
  if (Array.isArray(item?.skus) && item.skus.length > 0) {
    const uniqueSizes = [...new Set(item.skus.map(s => s.size).filter(Boolean))]
    if (uniqueSizes.length > 0) return uniqueSizes
  }
  return ['Free (원사이즈)', 'S', 'M', 'L', 'XL']
})

// 다중 옵션 (2차 사이즈/규격 존재 여부)
const hasMultipleOptions = computed(() => {
  return sizeOptions.value && sizeOptions.value.length > 1
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

  // 1. 단일 옵션 상품일 경우: 1차 선택 즉시 품목 리스트에 등록
  if (!hasMultipleOptions.value) {
    const colorName = color.name
    const sizeName = sizeOptions.value[0] || '기본'
    const existing = selectedSkus.value.find(s => s.color === colorName && s.size === sizeName)
    if (existing) {
      existing.quantity += 1
      showToastNotification(`[${colorName}] 수량이 1개 추가되었습니다.`)
    } else {
      selectedSkus.value.push({
        color: colorName,
        size: sizeName,
        quantity: minOrder.value || 1
      })
      showToastNotification(`[${colorName}] 품목이 추가되었습니다.`)
    }
  } else {
    // 2. 다중 옵션 상품일 경우: 2차 옵션 선택을 기다림 (리스트에 임의 추가 안 함)
    selectedSize.value = null
    showToastNotification(`[${color.name}] 선택 완료! 2차 옵션(사이즈)을 선택해 주세요.`, 'info')
  }
}

const handleSelectSize = (size) => {
  // 1차 옵션 미선택 가드
  if (!selectedColor.value) {
    showToastNotification('⚠️ 1차 옵션(색상/스타일)을 먼저 선택해 주세요.', 'warning')
    return
  }

  selectedSize.value = size
  const colorName = selectedColor.value.name
  const sizeName = size

  // 1차와 2차가 모두 선택 완료된 시점에만 품목 리스트에 추가
  const existing = selectedSkus.value.find(s => s.color === colorName && s.size === sizeName)
  if (existing) {
    existing.quantity += 1
    showToastNotification(`[${colorName} / ${sizeName}] 수량이 1개 추가되었습니다. (총 ${existing.quantity}개)`)
  } else {
    selectedSkus.value.push({
      color: colorName,
      size: sizeName,
      quantity: minOrder.value || 1
    })
    showToastNotification(`[${colorName} / ${sizeName}] 품목이 추가되었습니다.`)
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

// 다른 상품 클릭 시 모달 내에서 즉시 상품 전환
const selectAnotherProduct = (newProduct) => {
  currentItem.value = newProduct
  activeImage.value = newProduct.imageUrl || ''
  selectedColor.value = colorOptions.value[0] || null
  selectedSize.value = null
  selectedSkus.value = []

  // 단일 옵션 상품인 경우에만 기본 1차 품목 자동 등록
  if (!hasMultipleOptions.value && colorOptions.value[0]) {
    selectedSkus.value = [
      {
        color: colorOptions.value[0].name || '기본',
        size: sizeOptions.value[0] || '기본',
        quantity: Number(newProduct.minOrder) || 1
      }
    ]
  }

  // 상단으로 부드럽게 스크롤
  if (modalBodyRef.value) {
    modalBodyRef.value.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
      showToastNotification('⚠️ 2차 옵션(사이즈/규격)을 마저 선택해 주세요.', 'warning')
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
        const parts = [s.color, s.size].filter(p => p && p !== 'undefined')
        return (parts.length ? parts.join(' / ') : '기본 옵션') + (s.quantity ? ` (${s.quantity}개)` : '')
      }).join(', '),
      detailUrl: currentItem.value.detailUrl,
      company: currentItem.value.company || '1688 공급처',
      createdAt: new Date().toISOString()
    }

    cart.unshift(itemToSave)
    localStorage.setItem('euchs_erp_saved_items', JSON.stringify(cart))

    // Storage 이벤트 및 emit
    window.dispatchEvent(new Event('storage'))
    emit('added-to-cart', itemToSave)

    // ✅ 모달을 닫지 않고 상단에 성공 토스트 알림 노출
    showToastNotification(`✅ 보관함에 담겼습니다. (선택 ${selectedSkus.value.length}종 / 총 ${totalQuantity.value}개)`, 'success')
  } catch (err) {
    console.error('Failed to add to cart:', err)
  }
}

const handleInstantOrder = () => {
  if (!selectedSkus.value.length || totalQuantity.value === 0) {
    if (hasMultipleOptions.value && selectedColor.value && !selectedSize.value) {
      showToastNotification('⚠️ 2차 옵션(사이즈/규격)을 마저 선택해 주세요.', 'warning')
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
  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80'
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
    currentItem.value = newVal
    activeImage.value = newVal.imageUrl || ''
    selectedColor.value = colorOptions.value[0] || null
    selectedSize.value = null
    selectedSkus.value = []

    // 단일 옵션 상품일 때만 1차 옵션 기본 등록
    if (!hasMultipleOptions.value && colorOptions.value[0]) {
      selectedSkus.value = [
        {
          color: colorOptions.value[0].name || '기본',
          size: sizeOptions.value[0] || '기본',
          quantity: Number(newVal.minOrder) || 1
        }
      ]
    }

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
