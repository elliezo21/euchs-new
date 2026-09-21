<template>
  <div class="space-y-5">

    <!-- ===================================================== -->
    <!-- 페이지 헤더 -->
    <!-- ===================================================== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2 mb-0.5">
          <span class="text-[11px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">PRODUCT LIST</span>
          <h1 class="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">📋 내상품리스트</h1>
        </div>
        <p v-if="activeTab === TAB_SAVED" class="text-xs text-gray-500">
          상품 상세에서 ★찜한 상품이 카테고리별로 모입니다.
          총 <strong class="text-gray-900 font-mono tabular-nums">{{ savedItems.length }}</strong>개
        </p>
        <p v-else class="text-xs text-gray-500">
          결제가 확인된 주문에 포함된 상품을 많이 주문한 순으로 모읍니다.
        </p>
      </div>

      <!-- 상단 액션 버튼 그룹 (엑셀 일괄 업로드 / 상품등록 ▾)
           SHOW_LEGACY_REGISTER=false 로 숨김 — 등록분(localStorage)을 보여줄 화면이 없기 때문.
           엑셀 단계에서 saved_products 등록으로 재작업 후 true로 되살릴 것. -->
      <div v-if="SHOW_LEGACY_REGISTER" class="flex flex-wrap items-center gap-2">

        <!-- ★ 엑셀 일괄 업로드 상시 버튼 -->
        <button
          type="button"
          @click="openBulkExcelModal"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition cursor-pointer active:scale-95"
          title="대량 엑셀 파일로 상품을 한 번에 등록합니다"
        >
          <span>📤</span>
          <span>엑셀 일괄 업로드</span>
        </button>

        <!-- ★ 상품등록 ▾ 드롭다운 -->
        <div class="relative" ref="registerDropRef">
          <button
            type="button"
            @click="isRegisterDropOpen = !isRegisterDropOpen"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-sm transition cursor-pointer active:scale-95"
          >
            <span>상품등록</span>
            <span class="text-[11px]">▾</span>
          </button>
          <!-- 드롭다운 패널 -->
          <Transition name="dropdown-fade">
            <div
              v-if="isRegisterDropOpen"
              class="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <button type="button" @click="openUrlModal" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition cursor-pointer">
                <span>🔗</span><span>간편 URL 등록</span>
              </button>
              <button type="button" @click="openBulkExcelModal" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 transition cursor-pointer border-y border-orange-100">
                <span>📊</span><span>대량 EXCEL 등록</span>
              </button>
              <button type="button" @click="isRegisterDropOpen = false" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-gray-500 hover:bg-gray-50 transition cursor-pointer">
                <span>🏪</span><span>오프라인 등록</span>
              </button>
              <button type="button" @click="isRegisterDropOpen = false" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-gray-500 hover:bg-gray-50 transition cursor-pointer">
                <span>📦</span><span>세트상품 등록</span>
              </button>
              <button type="button" @click="isRegisterDropOpen = false" class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-semibold text-gray-500 hover:bg-gray-50 transition cursor-pointer">
                <span>🏷️</span><span>식검스티커 업로드</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- ===================================================== -->
    <!-- 탭: [찜한 상품] [주문한 상품] -->
    <!-- ===================================================== -->
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        @click="selectTab(TAB_SAVED)"
        class="px-4 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer active:scale-95"
        :class="activeTab === TAB_SAVED
          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'"
      >⭐ 찜한 상품</button>
      <button
        type="button"
        @click="selectTab(TAB_ORDERED)"
        class="px-4 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer active:scale-95"
        :class="activeTab === TAB_ORDERED
          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'"
      >🔄 주문한 상품</button>
    </div>

    <!-- ===================================================== -->
    <!-- [찜한 상품] 탭 본문 (기존 화면 그대로 — v-if로 감싸기만 함) -->
    <!-- ===================================================== -->
    <template v-if="activeTab === TAB_SAVED">

    <!-- ===================================================== -->
    <!-- 일괄 작업 바 (체크박스 선택 시 노출) -->
    <!-- ===================================================== -->
    <div
      v-if="selectedIds.length > 0"
      class="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-orange-50 border border-orange-200"
    >
      <span class="text-xs font-extrabold text-orange-700">
        선택 <span class="font-mono tabular-nums">{{ selectedIds.length }}</span>개
      </span>

      <button
        type="button"
        @click="selectedIds = []"
        class="text-xs font-bold text-gray-500 hover:text-gray-800 underline underline-offset-2 cursor-pointer transition"
      >선택 해제</button>

      <span class="text-orange-200">|</span>

      <!-- 일괄 카테고리 변경 -->
      <select
        v-model="bulkCategoryValue"
        :disabled="isBulkBusy"
        @change="applyBulkCategory"
        class="px-3 py-1.5 text-xs font-bold border border-orange-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50 cursor-pointer"
      >
        <option value="">선택 {{ selectedIds.length }}개 카테고리 변경…</option>
        <option v-for="cat in majorCategories" :key="cat.id" :value="cat.id">{{ cat.name_ko }}</option>
        <option value="__none__">미분류로 되돌리기</option>
      </select>

      <!-- 일괄 삭제 (인라인 확인) -->
      <template v-if="!isBulkDeleteConfirming">
        <button
          type="button"
          :disabled="isBulkBusy"
          @click="isBulkDeleteConfirming = true"
          class="px-3.5 py-1.5 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95"
        >🗑️ 선택 {{ selectedIds.length }}개 삭제</button>
      </template>
      <template v-else>
        <span class="text-xs font-bold text-red-600">{{ selectedIds.length }}개를 삭제할까요?</span>
        <button
          type="button"
          :disabled="isBulkBusy"
          @click="executeBulkDelete"
          class="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95"
        >{{ isBulkBusy ? '삭제 중…' : '삭제' }}</button>
        <button
          type="button"
          :disabled="isBulkBusy"
          @click="isBulkDeleteConfirming = false"
          class="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-gray-600 font-bold text-xs hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
        >취소</button>
      </template>
    </div>

    <!-- 필터 바 -->
    <div v-if="!isAdminSession" class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-xs">
        <span class="text-gray-400 text-xs">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="상품명 검색..."
          class="w-40 text-xs outline-none bg-transparent placeholder:text-gray-400"
        />
      </div>
      <!-- 모바일/태블릿: 좌측 카테고리 목록 대신 드롭다운 -->
      <select
        v-model="activeCategoryId"
        class="lg:hidden px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
      >
        <option value="">전체 카테고리 ({{ searchedItems.length }})</option>
        <option v-for="cat in categoriesWithItems" :key="cat.id" :value="cat.id">
          {{ cat.name_ko }} ({{ categoryCounts[cat.id] }})
        </option>
        <option v-if="uncategorizedCount > 0" :value="UNCATEGORIZED">미분류 ({{ uncategorizedCount }})</option>
      </select>
      <span class="text-xs text-gray-400 ml-auto font-mono tabular-nums">{{ filteredItems.length }}개 표시</span>
    </div>

    <!-- ===================================================== -->
    <!-- 본문: [좌] 카테고리 목록 + [우] 상품 섹션 -->
    <!-- ===================================================== -->
    <div class="flex items-start gap-4">

      <!-- 좌측 카테고리 목록 (PC 전용) -->
      <aside v-if="!isAdminSession" class="hidden lg:block w-52 shrink-0">
        <div class="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div class="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <span class="text-xs font-extrabold text-gray-700">카테고리</span>
          </div>
          <nav class="p-2 space-y-0.5">
            <button
              type="button"
              @click="activeCategoryId = ''"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-left"
              :class="activeCategoryId === '' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'"
            >
              <span>전체</span>
              <span class="font-mono tabular-nums">{{ searchedItems.length }}</span>
            </button>

            <button
              v-for="cat in categoriesWithItems"
              :key="cat.id"
              type="button"
              @click="activeCategoryId = cat.id"
              class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-left"
              :class="activeCategoryId === cat.id ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'"
            >
              <span class="truncate">{{ cat.name_ko }}</span>
              <span class="font-mono tabular-nums shrink-0">{{ categoryCounts[cat.id] }}</span>
            </button>

            <!-- 미분류는 항상 맨 아래 + 주황 계열로 구분 -->
            <button
              v-if="uncategorizedCount > 0"
              type="button"
              @click="activeCategoryId = UNCATEGORIZED"
              class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer text-left mt-1 border"
              :class="activeCategoryId === UNCATEGORIZED ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-50/60 text-orange-700 border-orange-200 hover:bg-orange-100'"
            >
              <span class="truncate">미분류</span>
              <span class="font-mono tabular-nums shrink-0">{{ uncategorizedCount }}</span>
            </button>
          </nav>
        </div>
      </aside>

      <!-- 우측 본문 -->
      <div class="flex-1 min-w-0 space-y-6">

        <!-- 로딩 스켈레톤 -->
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

        <!-- 관리자 세션 안내 (Supabase Auth 세션이 없어 RLS상 조회·저장 불가) -->
        <div v-else-if="isAdminSession" class="bg-white border border-amber-200 rounded-2xl shadow-xs py-20 text-center">
          <div class="text-5xl mb-4">🔒</div>
          <p class="text-sm font-bold text-amber-700 mb-2 px-6 leading-relaxed">
            관리자 계정으로는 찜 기능을 사용할 수 없습니다. 일반 회원 계정으로 로그인해 주세요.
          </p>
          <p class="text-xs text-gray-400">관리자 로그인 상태에서는 내상품리스트가 조회되지 않습니다.</p>
        </div>

        <!-- 빈 상태: 찜 자체가 0개 -->
        <div v-else-if="savedItems.length === 0" class="bg-white border border-gray-200 rounded-2xl shadow-xs py-20 text-center">
          <div class="text-5xl mb-4">⭐</div>
          <p class="text-sm font-bold text-gray-400 mb-2">아직 찜한 상품이 없어요</p>
          <p class="text-xs text-gray-400">1688 소싱몰에서 마음에 드는 상품의 ★를 눌러보세요</p>
          <router-link
            to="/mall"
            class="inline-block mt-5 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition cursor-pointer shadow-sm"
          >🛒 1688 소싱몰 가기</router-link>
        </div>

        <!-- 검색/필터 결과 없음 -->
        <div v-else-if="filteredItems.length === 0" class="bg-white border border-gray-200 rounded-2xl shadow-xs py-16 text-center">
          <div class="text-4xl mb-3">🔍</div>
          <p class="text-sm font-bold text-gray-400 mb-1">조건에 맞는 상품이 없습니다</p>
          <p class="text-xs text-gray-400">검색어나 카테고리 필터를 바꿔보세요.</p>
        </div>

        <!-- 대분류별 섹션 -->
        <section v-for="section in sections" :key="section.id" class="space-y-3">
          <div class="flex items-center gap-2 pb-2 border-b"
            :class="section.isUncategorized ? 'border-orange-200' : 'border-gray-200'">
            <h2 class="text-sm font-extrabold"
              :class="section.isUncategorized ? 'text-orange-700' : 'text-gray-900'">
              {{ section.name }}
            </h2>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-black font-mono tabular-nums"
              :class="section.isUncategorized ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'">
              {{ section.items.length }}
            </span>
            <span v-if="section.isUncategorized" class="text-[11px] font-bold text-orange-600">
              카테고리를 지정해주세요
            </span>
          </div>

          <!-- 카드 그리드 (style.css의 .product-card-grid — 주문한 상품 탭과 동일 기준) -->
          <div class="product-card-grid">
            <div
              v-for="item in section.items"
              :key="item.id"
              class="relative bg-white rounded-xl border transition-all duration-200 overflow-hidden flex flex-col"
              :class="selectedIds.includes(item.id) ? 'border-orange-400 shadow-md' : 'border-gray-200 hover:border-orange-300 hover:shadow-md'"
            >
              <!-- 썸네일 -->
              <div class="relative aspect-square bg-gray-100 overflow-hidden cursor-pointer group" @click="openDetailModal(item)">
                <img
                  :src="item.image_url || item.item_data?.imageUrl || FALLBACK_IMG"
                  :alt="displayTitle(item)"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  @error="handleImgError"
                />
                <!-- 선택 체크박스 -->
                <label class="absolute top-1 left-1 z-10 w-5 h-5 rounded-md bg-white/90 border border-gray-200 shadow-xs flex items-center justify-center cursor-pointer" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(item.id)"
                    @change="toggleSelect(item.id)"
                    class="w-3 h-3 accent-orange-500 cursor-pointer"
                  />
                </label>
                <!-- 판매중단 배지 -->
                <span v-if="item.is_unavailable"
                  class="absolute top-1 right-1 px-1 py-0.5 rounded bg-gray-900/80 text-white text-[9px] font-black">
                  판매중단
                </span>
              </div>

              <!-- 카드 본문 -->
              <div class="p-2 space-y-1 flex-1 flex flex-col">

                <!-- 상품명 (클릭 시 인라인 수정) -->
                <div class="min-h-[30px]">
                  <input
                    v-if="editingNameId === item.id"
                    v-model="editingNameValue"
                    type="text"
                    :disabled="isBusy(item.id)"
                    @keydown.enter.prevent="saveDisplayName(item)"
                    @keydown.esc.prevent="cancelNameEdit"
                    @blur="cancelNameEdit"
                    class="w-full px-1.5 py-0.5 text-[11px] border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50"
                    placeholder="상품 이름 (Enter 저장 · Esc 취소)"
                  />
                  <h3
                    v-else
                    @click="startNameEdit(item)"
                    class="text-[11px] font-medium text-gray-800 leading-snug line-clamp-2 cursor-text hover:text-orange-600 transition"
                    :title="displayTitle(item) + ' (클릭하여 이름 수정)'"
                  >
                    {{ displayTitle(item) }}
                  </h3>
                </div>

                <!-- 가격 -->
                <div class="flex items-baseline gap-1 font-mono tabular-nums pt-1 border-t border-gray-100 whitespace-nowrap">
                  <span class="text-red-600 font-bold text-[13px]">¥{{ formatCny(item.snapshot_price) }}</span>
                  <span class="text-gray-400 text-[10px]">₩{{ formatNumber(krwFromCny(Number(item.snapshot_price) || 0, exchangeRate)) }}</span>
                </div>

                <!-- 메모 (클릭 시 인라인 수정) -->
                <div class="min-h-[18px]">
                  <input
                    v-if="editingMemoId === item.id"
                    v-model="editingMemoValue"
                    type="text"
                    :disabled="isBusy(item.id)"
                    @keydown.enter.prevent="saveMemo(item)"
                    @keydown.esc.prevent="cancelMemoEdit"
                    @blur="cancelMemoEdit"
                    class="w-full px-1.5 py-0.5 text-[10px] border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50"
                    placeholder="메모 (Enter 저장 · Esc 취소)"
                  />
                  <p
                    v-else
                    @click="startMemoEdit(item)"
                    class="text-[10px] truncate cursor-text transition"
                    :class="item.memo ? 'text-gray-500 hover:text-orange-600' : 'text-gray-300 hover:text-orange-500'"
                    :title="item.memo || '클릭하여 메모 추가'"
                  >
                    {{ item.memo || '+ 메모 추가' }}
                  </p>
                </div>

                <!-- 카테고리 드롭다운 -->
                <select
                  :key="`cat-${item.id}-${item.category_id || 'none'}-${categorySelectNonce}`"
                  :value="item.category_id || ''"
                  :disabled="isBusy(item.id)"
                  @change="changeCategory(item, $event.target.value)"
                  class="w-full px-1.5 py-1 text-[10px] font-bold border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer disabled:opacity-50"
                  :class="item.category_id ? 'border-gray-200 text-gray-700' : 'border-orange-200 text-orange-600 bg-orange-50/60'"
                >
                  <option value="">미분류</option>
                  <option v-for="cat in majorCategories" :key="cat.id" :value="cat.id">{{ cat.name_ko }}</option>
                </select>

                <!-- 액션 버튼 -->
                <div class="flex items-center gap-1 pt-0.5 mt-auto">
                  <button
                    type="button"
                    :disabled="item.is_unavailable"
                    @click="openDetailModal(item)"
                    class="flex-1 min-w-0 px-1 py-1.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    :title="item.is_unavailable ? '판매중단 상품입니다' : '옵션을 선택해 장바구니에 담습니다'"
                  >🛒 장바구니에 넣기</button>
                  <button
                    type="button"
                    :disabled="isBusy(item.id)"
                    @click="confirmDeleteId = item.id"
                    class="shrink-0 w-6 h-6 rounded-md border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 text-[10px] transition cursor-pointer disabled:opacity-50"
                    title="내상품리스트에서 삭제"
                  >🗑️</button>
                </div>
              </div>

              <!-- 삭제 인라인 확인 (카드 내부 오버레이) -->
              <div
                v-if="confirmDeleteId === item.id"
                class="absolute inset-0 z-20 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-2 text-center"
              >
                <p class="text-[11px] font-extrabold text-gray-800">삭제할까요?</p>
                <p class="text-[10px] text-gray-400 leading-snug">내상품리스트에서만 제거됩니다.</p>
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    :disabled="isBusy(item.id)"
                    @click="executeDelete(item)"
                    class="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] transition cursor-pointer disabled:opacity-50 active:scale-95 whitespace-nowrap"
                  >{{ isBusy(item.id) ? '삭제 중…' : '삭제' }}</button>
                  <button
                    type="button"
                    :disabled="isBusy(item.id)"
                    @click="confirmDeleteId = null"
                    class="px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 font-bold text-[10px] hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                  >취소</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    </template>

    <!-- ===================================================== -->
    <!-- [주문한 상품] 탭 본문 -->
    <!-- v-if: 탭을 처음 연 순간에만 마운트 → onMounted에서 1회 조회 -->
    <!-- v-show: 이후 탭 전환은 표시/숨김만 (재조회 없음) -->
    <!-- ===================================================== -->
    <OrderedProductsPanel
      v-if="hasOpenedOrderedTab"
      v-show="activeTab === TAB_ORDERED"
      :exchange-rate="exchangeRate"
      @open-detail="openDetailModal"
    />

    <!-- ===================================================== -->
    <!-- CN인사이더 스타일 EXCEL 상품추가 모달 (이번 작업 범위 밖 — 기존 유지) -->
    <!-- ===================================================== -->
    <Transition name="modal-fade">
      <div v-if="isBulkExcelModalOpen"
        class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="closeBulkExcelModal">
        <div class="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-gray-200 overflow-hidden">

          <!-- 모달 헤더 -->
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 class="font-extrabold text-gray-900 text-base">EXCEL 상품추가</h3>
            <button @click="closeBulkExcelModal" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer text-xl leading-none">✕</button>
          </div>

          <!-- 모달 본문 -->
          <div class="p-6 space-y-5">
            <!-- 상품정보 다운로드 섹션 -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs font-extrabold text-gray-800 mb-0.5">상품정보</div>
                  <div class="text-xs text-gray-500">표준 양식을 내려받아 상품 정보를 작성하세요.</div>
                </div>
                <button
                  type="button"
                  @click="handleDownloadTemplate"
                  class="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition cursor-pointer active:scale-95 shadow-sm"
                >
                  <span>📥</span>
                  <span>EXCEL 양식 다운로드</span>
                </button>
              </div>
            </div>

            <!-- 파일 업로드 드래그앤드롭 영역 -->
            <div>
              <input
                ref="bulkFileInputRef"
                type="file"
                accept=".xlsx,.xls,.csv"
                class="hidden"
                @change="onBulkFileSelect"
              />
              <div
                class="border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center text-center"
                :class="bulkDragOver
                  ? 'border-emerald-500 bg-emerald-50/70 scale-[0.99]'
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 bg-slate-50/50'"
                @dragover.prevent="bulkDragOver = true"
                @dragleave="bulkDragOver = false"
                @drop.prevent="onBulkFileDrop"
                @click="triggerBulkFileInput"
                style="min-height: 180px;"
              >
                <!-- 파일 미선택 상태 -->
                <div v-if="!bulkParsedItems.length" class="space-y-2.5 py-4">
                  <div class="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs text-2xl">
                    📊
                  </div>
                  <div>
                    <p class="text-sm font-bold text-gray-800">
                      파일을 여기로 끌어오거나 <span class="text-emerald-600 underline">클릭하여 업로드</span>
                    </p>
                    <p class="text-xs text-gray-400 mt-1">
                      지원 형식: XLSX, XLS, CSV (최대 20MB)
                    </p>
                  </div>
                  <div class="pt-1">
                    <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition pointer-events-none">
                      📁 엑셀 파일 선택하기
                    </span>
                  </div>
                </div>
                <!-- 파싱 완료 상태 -->
                <div v-else class="w-full p-2 text-left" @click.stop>
                  <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <div class="flex items-center gap-1.5">
                      <span class="text-emerald-600 font-black">✅</span>
                      <span class="text-xs font-extrabold text-emerald-800">{{ bulkParsedItems.length }}개 상품 파싱 완료</span>
                    </div>
                    <button
                      type="button"
                      @click="bulkParsedItems = []"
                      class="text-xs text-gray-400 hover:text-red-500 font-bold cursor-pointer transition"
                    >
                      다시 선택
                    </button>
                  </div>
                  <div class="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    <div
                      v-for="(item, i) in bulkParsedItems"
                      :key="i"
                      class="flex items-center gap-2 p-2.5 bg-white rounded-xl text-xs border border-gray-200/80 shadow-2xs"
                    >
                      <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0">
                        {{ i+1 }}
                      </span>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-gray-900 truncate">{{ item.productName }}</div>
                        <div class="text-xs text-gray-500 truncate">
                          {{ item.sku ? `옵션: ${item.sku} · ` : '' }}수량: {{ item.quantity || 1 }}개
                        </div>
                      </div>
                      <span class="text-xs font-mono font-bold text-emerald-600 shrink-0">
                        {{ item.priceCny ? '¥' + Number(item.priceCny).toFixed(2) : '' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 모달 푸터 -->
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <button @click="closeBulkExcelModal" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer">취소</button>
            <button
              @click="submitBulkExcel"
              :disabled="!bulkParsedItems.length"
              class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs transition cursor-pointer shadow-sm active:scale-95"
            >
              📤 {{ bulkParsedItems.length }}개 상품 일괄 등록
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 간편 URL 등록 모달 (이번 작업 범위 밖 — 기존 유지) -->
    <Transition name="modal-fade">
      <div v-if="isUrlModalOpen"
        class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="isUrlModalOpen = false">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 class="font-extrabold text-gray-900 text-sm">🔗 간편 URL 등록</h3>
            <button @click="isUrlModalOpen = false" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer text-xl leading-none">✕</button>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 mb-1.5">1688 상품 URL</label>
              <input
                v-model="urlInput"
                type="url"
                placeholder="https://detail.1688.com/offer/..."
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">수량</label>
                <input v-model.number="urlQty" type="number" min="1" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">카테고리</label>
                <input v-model="urlCategory" type="text" placeholder="(선택)" list="spv-cat-list" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none" />
                <datalist id="spv-cat-list">
                  <option v-for="cat in PRESET_CATEGORIES" :key="cat" :value="cat" />
                </datalist>
              </div>
            </div>
          </div>
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <button @click="isUrlModalOpen = false" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer">취소</button>
            <button @click="submitUrlItem" :disabled="!urlInput.trim()" class="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xs transition cursor-pointer">등록</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 상품 상세보기 모달 (MallView / CartView와 동일 컴포넌트 재사용) -->
    <ProductDetailModal
      :product="selectedDetailProduct"
      :exchange-rate="exchangeRate"
      @close="handleDetailModalClose"
      @change-product="selectedDetailProduct = $event"
    />

    <!-- 토스트 -->
    <transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="toastMessage"
        class="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold"
        :class="toastType === 'error'
          ? 'bg-red-950 text-red-100 border-red-700'
          : 'bg-slate-900 text-white border-slate-700'"
      >
        <span>{{ toastType === 'error' ? '⚠️' : '✅' }}</span>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { downloadBulkOrderTemplate, parseOrderExcel } from '@/utils/excelHandler';
import ProductDetailModal from '@/components/ProductDetailModal.vue';
import OrderedProductsPanel from '@/components/dashboard/OrderedProductsPanel.vue';
import { currentUser, isLoggedIn } from '@/lib/auth';
import { fetchSiteSettings, currentSettings } from '@/lib/settings';
import { krwFromCny } from '@/utils/orderCostCalculator';
import {
  fetchMajorCategories,
  listSavedProducts,
  updateSavedProduct,
  deleteSavedProducts,
  hasSupabaseSession,
} from '@/lib/savedProducts';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80';
const UNCATEGORIZED = '__none__';

// 엑셀 일괄 업로드 / 상품등록 ▾ 버튼 노출 여부.
// 이 경로로 등록한 상품은 localStorage에만 저장되고 이 화면에 표시되지 않으므로 숨김.
// 관련 모달·핸들러는 삭제하지 않고 그대로 둠 (엑셀 단계 재작업 시 true로 복구).
const SHOW_LEGACY_REGISTER = false;

// ─── 프리셋 카테고리 (간편 URL 등록 모달 datalist 전용 — 기존 유지) ────
const PRESET_CATEGORIES = [
  '가전/생활용품', '의류/패션', '주방/식기', '뷰티/헬스',
  '완구/스포츠', '사무/문구', '식품/음료', '자동차용품', '기타',
];

// ─── 환율 (장바구니 화면과 동일 소스) ─────────────────────
const exchangeRate = computed(() => Number(currentSettings.value?.exchange_rate) || 200.0);

// ─── 탭 (찜한 상품 / 주문한 상품) ─────────────────────────
const TAB_SAVED = 'saved';
const TAB_ORDERED = 'ordered';
const activeTab = ref(TAB_SAVED);
// 주문한 상품 패널은 처음 선택될 때 한 번만 마운트되고, 이후 탭 전환은 v-show로 처리한다.
const hasOpenedOrderedTab = ref(false);

function selectTab(tab) {
  activeTab.value = tab;
  if (tab === TAB_ORDERED) hasOpenedOrderedTab.value = true;
}

// ─── 내상품리스트 State ───────────────────────────────────
const savedItems = ref([]);
const majorCategories = ref([]);
const isLoading = ref(true);
// 관리자 토큰 경로 등 Supabase Auth 세션이 없는 상태 (RLS상 조회·저장 모두 불가)
const isAdminSession = ref(false);
const searchQuery = ref('');
const activeCategoryId = ref('');       // '' = 전체 | uuid | UNCATEGORIZED
const selectedIds = ref([]);
const busyIds = ref([]);                // 저장 요청 중인 행 id
const confirmDeleteId = ref(null);

// ─── 토스트 ───────────────────────────────────────────────
const toastMessage = ref('');
const toastType = ref('success');       // 'success' | 'error'
let toastTimer = null;
function showToast(msg, type = 'success') {
  toastMessage.value = msg;
  toastType.value = type;
  if (toastTimer) clearTimeout(toastTimer);
  // 실패 메시지는 원인 문장이 길어 6초, 성공은 3초
  toastTimer = setTimeout(() => { toastMessage.value = ''; }, type === 'error' ? 6000 : 3000);
}

// ─── 데이터 로드 ──────────────────────────────────────────
async function loadAll(silent = false) {
  if (!isLoggedIn.value || !currentUser.value?.id) {
    savedItems.value = [];
    isLoading.value = false;
    return;
  }
  if (!silent) isLoading.value = true;
  try {
    // 관리자 세션이면 목록 조회 자체가 무의미(RLS상 0건) → 안내 화면으로 전환
    isAdminSession.value = !(await hasSupabaseSession());
    if (isAdminSession.value) {
      savedItems.value = [];
      selectedIds.value = [];
      return;
    }
    const [cats, rows] = await Promise.all([fetchMajorCategories(), listSavedProducts()]);
    majorCategories.value = cats;
    savedItems.value = rows;
    // 삭제된 행이 선택 목록에 남지 않도록 정리
    const aliveIds = new Set(rows.map(r => r.id));
    selectedIds.value = selectedIds.value.filter(id => aliveIds.has(id));
  } catch (err) {
    console.error('[내상품리스트] 로드 실패:', err);
    showToast(`목록을 불러오지 못했습니다: ${err.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
}

// ─── 필터링 ───────────────────────────────────────────────
const HANGUL_RE = /[가-힣]/;
const CJK_RE = /[一-鿿]/;

// item_data.titleKo가 실제 한글 제목일 때만 반환.
// 한글 없이 중국어만 있으면(번역 실패 시 원문이 들어간 경우) title_zh와 같은 취급 → ''
function koreanTitle(item) {
  const ko = String(item.item_data?.titleKo || '').trim();
  if (!ko) return '';
  if (!HANGUL_RE.test(ko) && CJK_RE.test(ko)) return '';
  return ko;
}

// 표시 순서: display_name → item_data.titleKo(한글) → title_zh
// (카드 제목 / 이름 수정 입력창 초기값 / alt 텍스트가 모두 이 함수를 사용)
function displayTitle(item) {
  return item.display_name
    || koreanTitle(item)
    || item.title_zh
    || String(item.item_data?.titleKo || '').trim()
    || '이름 없는 상품';
}

// 검색어만 적용한 목록 (좌측 카테고리 개수의 기준)
const searchedItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return savedItems.value;
  return savedItems.value.filter(it =>
    [it.display_name, it.item_data?.titleKo, it.title_zh, it.memo]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q))
  );
});

// 검색어 + 카테고리 필터 적용
const filteredItems = computed(() => {
  if (activeCategoryId.value === UNCATEGORIZED) {
    return searchedItems.value.filter(it => !it.category_id);
  }
  if (activeCategoryId.value) {
    return searchedItems.value.filter(it => it.category_id === activeCategoryId.value);
  }
  return searchedItems.value;
});

const categoryCounts = computed(() => {
  const counts = {};
  for (const it of searchedItems.value) {
    if (!it.category_id) continue;
    counts[it.category_id] = (counts[it.category_id] || 0) + 1;
  }
  return counts;
});

const uncategorizedCount = computed(() =>
  searchedItems.value.filter(it => !it.category_id).length
);

// 상품이 1개 이상 있는 대분류만 (categories.sort_order 순 — fetch 시 정렬됨)
const categoriesWithItems = computed(() =>
  majorCategories.value.filter(cat => (categoryCounts.value[cat.id] || 0) > 0)
);

// 본문 섹션: 대분류별로 세로 스택, 미분류는 맨 아래
const sections = computed(() => {
  const list = [];
  for (const cat of majorCategories.value) {
    const items = filteredItems.value.filter(it => it.category_id === cat.id);
    if (items.length > 0) {
      list.push({ id: cat.id, name: cat.name_ko, items, isUncategorized: false });
    }
  }
  const none = filteredItems.value.filter(it => !it.category_id);
  if (none.length > 0) {
    list.push({ id: UNCATEGORIZED, name: '미분류', items: none, isUncategorized: true });
  }
  return list;
});

// ─── 선택 관리 ────────────────────────────────────────────
function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(id);
}

// ─── 저장 요청 중 표시 ────────────────────────────────────
const isBusy = (id) => busyIds.value.includes(id);
function setBusy(id, on) {
  if (on) {
    if (!busyIds.value.includes(id)) busyIds.value.push(id);
  } else {
    busyIds.value = busyIds.value.filter(v => v !== id);
  }
}

/** RPC가 돌려준 최신 행으로 로컬 목록 갱신 */
function applyUpdatedRow(row) {
  if (!row?.id) return;
  const idx = savedItems.value.findIndex(it => it.id === row.id);
  if (idx >= 0) savedItems.value[idx] = { ...savedItems.value[idx], ...row };
}

// ─── 상품명 인라인 수정 ───────────────────────────────────
const editingNameId = ref(null);
const editingNameValue = ref('');

function startNameEdit(item) {
  editingNameId.value = item.id;
  editingNameValue.value = displayTitle(item);
  nextTick(() => {
    const el = document.querySelector(`input[placeholder^="상품 이름"]`);
    if (el) { el.focus(); el.select(); }
  });
}
function cancelNameEdit() {
  editingNameId.value = null;
  editingNameValue.value = '';
}
async function saveDisplayName(item) {
  const next = editingNameValue.value.trim();
  // 입력창 초기값이 '현재 표시 중인 제목'이므로, 표시값과 같으면 변경 없음으로 본다
  // (안 바꾸고 Enter만 눌렀을 때 titleKo/title_zh가 display_name으로 저장되는 것 방지)
  if (next === displayTitle(item)) { cancelNameEdit(); return; }
  setBusy(item.id, true);
  try {
    const row = await updateSavedProduct(item.id, { displayName: next });
    applyUpdatedRow(row);
    showToast(next ? '상품명을 저장했어요' : '상품명을 지웠어요');
    cancelNameEdit();
  } catch (err) {
    console.error('[내상품리스트] 상품명 저장 실패:', err);
    showToast(err.message, 'error');
  } finally {
    setBusy(item.id, false);
  }
}

// ─── 메모 인라인 수정 ─────────────────────────────────────
const editingMemoId = ref(null);
const editingMemoValue = ref('');

function startMemoEdit(item) {
  editingMemoId.value = item.id;
  editingMemoValue.value = item.memo || '';
  nextTick(() => {
    const el = document.querySelector(`input[placeholder^="메모"]`);
    if (el) { el.focus(); el.select(); }
  });
}
function cancelMemoEdit() {
  editingMemoId.value = null;
  editingMemoValue.value = '';
}
async function saveMemo(item) {
  const next = editingMemoValue.value.trim();
  if (next === (item.memo || '')) { cancelMemoEdit(); return; }
  setBusy(item.id, true);
  try {
    const row = await updateSavedProduct(item.id, { memo: next });
    applyUpdatedRow(row);
    showToast(next ? '메모를 저장했어요' : '메모를 지웠어요');
    cancelMemoEdit();
  } catch (err) {
    console.error('[내상품리스트] 메모 저장 실패:', err);
    showToast(err.message, 'error');
  } finally {
    setBusy(item.id, false);
  }
}

// ─── 카테고리 변경 (RPC 전용) ─────────────────────────────
// 실패 시 select가 선택한 값을 그대로 붙잡고 있지 않도록 key를 바꿔 강제 재생성한다
const categorySelectNonce = ref(0);

async function changeCategory(item, value) {
  const nextId = value || null;
  if ((item.category_id || null) === nextId) return;
  setBusy(item.id, true);
  try {
    const row = await updateSavedProduct(
      item.id,
      nextId ? { categoryId: nextId } : { clearCategory: true }
    );
    applyUpdatedRow(row);
    const catName = majorCategories.value.find(c => c.id === nextId)?.name_ko || '미분류';
    showToast(`'${catName}'(으)로 이동했어요`);
  } catch (err) {
    console.error('[내상품리스트] 카테고리 변경 실패:', err);
    showToast(err.message, 'error');
    categorySelectNonce.value++;   // 저장 전 값으로 되돌림
  } finally {
    setBusy(item.id, false);
  }
}

// ─── 삭제 (단건) ──────────────────────────────────────────
async function executeDelete(item) {
  setBusy(item.id, true);
  try {
    await deleteSavedProducts([item.id]);
    savedItems.value = savedItems.value.filter(it => it.id !== item.id);
    selectedIds.value = selectedIds.value.filter(id => id !== item.id);
    confirmDeleteId.value = null;
    showToast('내상품리스트에서 뺐어요');
  } catch (err) {
    console.error('[내상품리스트] 삭제 실패:', err);
    showToast(err.message, 'error');
  } finally {
    setBusy(item.id, false);
  }
}

// ─── 일괄 작업 ────────────────────────────────────────────
const isBulkBusy = ref(false);
const isBulkDeleteConfirming = ref(false);
const bulkCategoryValue = ref('');

async function executeBulkDelete() {
  if (selectedIds.value.length === 0) return;
  const targets = [...selectedIds.value];
  isBulkBusy.value = true;
  try {
    await deleteSavedProducts(targets);
    savedItems.value = savedItems.value.filter(it => !targets.includes(it.id));
    selectedIds.value = [];
    isBulkDeleteConfirming.value = false;
    showToast(`${targets.length}개를 내상품리스트에서 뺐어요`);
  } catch (err) {
    console.error('[내상품리스트] 일괄 삭제 실패:', err);
    showToast(err.message, 'error');
    loadAll(true);   // 부분 반영 가능성 → 서버 상태로 재동기화
  } finally {
    isBulkBusy.value = false;
  }
}

async function applyBulkCategory() {
  const value = bulkCategoryValue.value;
  if (!value || selectedIds.value.length === 0) return;
  const targets = [...selectedIds.value];
  const toUncategorized = value === UNCATEGORIZED;
  isBulkBusy.value = true;
  let successCount = 0;
  let firstError = null;
  try {
    for (const id of targets) {
      try {
        const row = await updateSavedProduct(
          id,
          toUncategorized ? { clearCategory: true } : { categoryId: value }
        );
        applyUpdatedRow(row);
        successCount++;
      } catch (err) {
        console.error('[내상품리스트] 일괄 카테고리 변경 실패 (id:', id, '):', err);
        if (!firstError) firstError = err;
      }
    }
    const catName = toUncategorized
      ? '미분류'
      : (majorCategories.value.find(c => c.id === value)?.name_ko || '카테고리');
    if (firstError) {
      showToast(`${targets.length}개 중 ${successCount}개만 변경됨: ${firstError.message}`, 'error');
    } else {
      showToast(`${successCount}개를 '${catName}'(으)로 옮겼어요`);
      selectedIds.value = [];
    }
  } finally {
    bulkCategoryValue.value = '';
    isBulkBusy.value = false;
  }
}

// ─── 상품 상세 모달 (장바구니 담기 / 이미지 클릭) ─────────
const selectedDetailProduct = ref(null);

function openDetailModal(item) {
  if (!item?.item_id) {
    showToast('상품 ID가 없어 상세를 열 수 없습니다.', 'error');
    return;
  }
  const data = item.item_data || {};
  selectedDetailProduct.value = {
    ...data,
    // ProductDetailModal은 id로 fetch1688ProductById를 호출한다 (1688 offerId)
    id: item.item_id,
    titleKo: item.display_name || data.titleKo || item.title_zh || '',
    titleZh: item.title_zh || data.titleZh || '',
    imageUrl: item.image_url || data.imageUrl || '',
    price: Number(item.snapshot_price) || Number(data.priceTiers?.[0]?.price) || 0,
    minOrder: data.minOrder || 1,
  };
}

// 모달 안에서 찜 해제할 수 있으므로 닫을 때 목록을 조용히 재동기화
function handleDetailModalClose() {
  selectedDetailProduct.value = null;
  loadAll(true);
}

// ─── 표시 헬퍼 ────────────────────────────────────────────
function formatNumber(num) {
  return Math.round(Number(num) || 0).toLocaleString('ko-KR');
}
function formatCny(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '–';
}
function handleImgError(e) {
  e.target.src = FALLBACK_IMG;
}

// ─── 등록 드롭다운 ────────────────────────────────────────
const isRegisterDropOpen = ref(false);
const registerDropRef = ref(null);
function closeDropOnOutside(e) {
  if (registerDropRef.value && !registerDropRef.value.contains(e.target)) isRegisterDropOpen.value = false;
}

// ─── EXCEL 상품추가 모달 (이번 작업 범위 밖 — 기존 로직 유지) ─────────
// 현재는 파싱 결과를 localStorage(euchs_sourcing_products)에 보관한다.
// 다음 단계에서 saved_products 등록으로 재작업 예정.
const isBulkExcelModalOpen = ref(false);
const bulkParsedItems = ref([]);
const bulkDragOver = ref(false);
const bulkFileInputRef = ref(null);

function openBulkExcelModal() {
  isRegisterDropOpen.value = false;
  bulkParsedItems.value = [];
  isBulkExcelModalOpen.value = true;
}
function closeBulkExcelModal() {
  isBulkExcelModalOpen.value = false;
  bulkParsedItems.value = [];
  if (bulkFileInputRef.value) {
    bulkFileInputRef.value.value = '';
  }
}

function triggerBulkFileInput() {
  if (bulkFileInputRef.value) {
    bulkFileInputRef.value.click();
  }
}

function handleDownloadTemplate() {
  try { downloadBulkOrderTemplate(); }
  catch (e) {
    console.error('[내상품리스트] 엑셀 양식 다운로드 실패:', e);
    showToast('양식 다운로드 실패: ' + e.message, 'error');
  }
}
async function parseBulkFile(file) {
  try {
    const parsed = await parseOrderExcel(file);
    if (!parsed || parsed.length === 0) {
      showToast('파싱된 상품이 없습니다. 표준 양식을 내려받아 작성 후 업로드해 주세요.', 'error');
      return;
    }
    bulkParsedItems.value = parsed;
  } catch (e) {
    console.error('[EUCHS] 엑셀 파싱 오류:', e);
    showToast('엑셀 파싱 실패: 파일 서식을 확인해 주세요. (' + e.message + ')', 'error');
  }
}
function onBulkFileSelect(e) {
  const file = e.target.files?.[0];
  // 동일 파일 재선택을 위해 value 리셋
  e.target.value = '';
  if (file) parseBulkFile(file);
}
function onBulkFileDrop(e) {
  bulkDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  // 확장자 검증
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    showToast('엑셀 파일(.xlsx, .xls, .csv)만 업로드 가능합니다.', 'error');
    return;
  }
  parseBulkFile(file);
}
function submitBulkExcel() {
  if (!bulkParsedItems.value.length) return;
  const newItems = bulkParsedItems.value.map(item => ({
    id: `sp-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    productName: item.productName || '1688 상품',
    name: item.productName || '1688 상품',
    productUrl: item.productUrl || '',
    imageUrl: item.imageUrl || '',
    sku: item.sku || item.selectedOption || '기본',
    quantity: item.quantity || 1,
    priceCny: item.priceCny || 0,
    category: item.category || '',
    remark: item.remark || '',
  }));
  const count = newItems.length;
  persistLegacyItems([...newItems, ...loadLegacyItems()]);
  closeBulkExcelModal();
  showToast(`${count}개 상품이 등록되었습니다. (엑셀 등록분은 다음 단계에서 내상품리스트와 통합됩니다)`);
}

// ─── 간편 URL 등록 모달 (이번 작업 범위 밖 — 기존 로직 유지) ─────────
const isUrlModalOpen = ref(false);
const urlInput = ref('');
const urlQty = ref(1);
const urlCategory = ref('');
function openUrlModal() {
  isRegisterDropOpen.value = false;
  urlInput.value = ''; urlQty.value = 1; urlCategory.value = '';
  isUrlModalOpen.value = true;
}
function submitUrlItem() {
  if (!urlInput.value.trim()) return;
  const newItem = {
    id: `sp-url-${Date.now()}`,
    productName: '1688 URL 등록 상품',
    productUrl: urlInput.value.trim(),
    sku: '기본',
    quantity: urlQty.value || 1,
    priceCny: 0,
    category: urlCategory.value.trim(),
  };
  persistLegacyItems([newItem, ...loadLegacyItems()]);
  isUrlModalOpen.value = false;
  showToast('URL 상품이 등록되었습니다. (다음 단계에서 내상품리스트와 통합됩니다)');
}

// ─── 레거시 localStorage 보관 (엑셀/URL 등록분) ───────────
function persistLegacyItems(list) {
  try {
    localStorage.setItem('euchs_sourcing_products', JSON.stringify(list));
  } catch (e) {
    console.error('[내상품리스트] 로컬 저장 실패:', e);
    showToast('로컬 저장에 실패했습니다: ' + e.message, 'error');
  }
}
function loadLegacyItems() {
  try {
    const raw = localStorage.getItem('euchs_sourcing_products');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[내상품리스트] 로컬 데이터 파싱 실패:', e);
    return [];
  }
}

// ─── Auth 상태 변경 핸들러 — 로그아웃 시 개인 데이터 즉시 초기화 ─────
// DashboardView.onAuthChanged / OrderManageView.onAuthChanged와 동일 패턴.
// (라우팅 없이 로그아웃하면 화면이 그대로 남아 이전 계정의 찜 목록이 노출된다)
function onAuthChanged(e) {
  if (!e.detail?.user) {
    // 로그아웃: 찜 목록·선택 상태 즉시 비우기
    savedItems.value = [];
    selectedIds.value = [];
    confirmDeleteId.value = null;
    isBulkDeleteConfirming.value = false;
    // 주문한 상품 패널 언마운트 → "첫 로드 1회" 플래그 리셋
    // (다음 로그인 때 새 계정 기준으로 다시 조회된다)
    hasOpenedOrderedTab.value = false;
    activeTab.value = TAB_SAVED;
  } else {
    // 로그인 또는 계정 전환: 해당 계정 데이터 재로드
    loadAll(true);
  }
}

// ─── 라이프사이클 ─────────────────────────────────────────
watch(isLoggedIn, (v) => { if (v) loadAll(); });

// 선택 중인 카테고리가 비면 '전체'로 자동 복귀 (빈 화면에 갇히지 않도록)
watch([categoryCounts, uncategorizedCount], () => {
  if (isLoading.value || searchQuery.value.trim()) return;
  if (activeCategoryId.value === UNCATEGORIZED && uncategorizedCount.value === 0) {
    activeCategoryId.value = '';
  } else if (activeCategoryId.value && activeCategoryId.value !== UNCATEGORIZED
    && !(categoryCounts.value[activeCategoryId.value] > 0)) {
    activeCategoryId.value = '';
  }
});

onMounted(() => {
  fetchSiteSettings();
  loadAll();
  document.addEventListener('click', closeDropOnOutside);
  window.addEventListener('euchs-auth-changed', onAuthChanged);
});
onUnmounted(() => {
  document.removeEventListener('click', closeDropOnOutside);
  window.removeEventListener('euchs-auth-changed', onAuthChanged);
  if (toastTimer) clearTimeout(toastTimer);
});
</script>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.dropdown-fade-enter-active, .dropdown-fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.dropdown-fade-enter-from, .dropdown-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
