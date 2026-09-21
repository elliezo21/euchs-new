<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

    <!-- 카드 A 헤더: 배너 관리 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-black text-slate-900">배너 관리</h1>
        <p class="text-base text-slate-500 mt-0.5">메인 소싱몰 상단 롤링 배너를 관리합니다.</p>
      </div>
      <button type="button" @click="openAddModal"
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-sm transition cursor-pointer">
        <i class="fas fa-plus text-sm"></i>
        배너 추가
      </button>
    </div>

    <!-- 카드 A: 배너 목록 -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-slate-400">
        <i class="fas fa-spinner fa-spin text-2xl mb-2 block"></i>불러오는 중...
      </div>
      <div v-else-if="banners.length === 0" class="p-10 text-center text-slate-400">
        <i class="fas fa-image text-4xl mb-3 block text-slate-200"></i>
        <p class="font-bold">등록된 배너가 없습니다.</p>
        <p class="text-base mt-1">위의 "배너 추가" 버튼으로 첫 배너를 등록하세요.</p>
      </div>
      <div v-else class="divide-y divide-slate-100">
        <div v-for="banner in banners" :key="banner.id"
          class="flex items-center gap-4 p-4 hover:bg-slate-50 transition">
          <!-- 썸네일 -->
          <div class="w-24 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            <img :src="banner.image_url" :alt="banner.title || '배너'"
              class="w-full h-full object-cover" @error="handleImgError" />
          </div>
          <!-- 정보 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-bold text-slate-800 text-base truncate">{{ banner.title || '(제목 없음)' }}</p>
              <span :class="['px-2 py-0.5 rounded text-xs font-bold', banner.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500']">
                {{ banner.is_active ? '노출중' : '비활성' }}
              </span>
              <template v-if="banner.section_key">
                <span class="px-2 py-0.5 rounded text-xs font-bold border bg-purple-50 text-purple-600 border-purple-200">
                  {{ SECTION_LABELS[banner.section_key] || banner.section_key }} 섹션배너
                </span>
              </template>
              <span v-else :class="['px-2 py-0.5 rounded text-xs font-bold border', banner.slot === 'right' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200']">
                {{ banner.slot === 'right' ? '오른쪽 칸' : '왼쪽 칸' }}
              </span>
            </div>
            <p class="text-sm text-slate-400 mt-0.5 truncate">
              {{ banner.link_url || '링크 없음' }}
              <span v-if="banner.link_type === 'external'" class="ml-1 text-blue-400">(외부링크)</span>
            </p>
            <p class="text-xs text-slate-400 mt-0.5">
              순서 {{ banner.display_order }}
              <template v-if="banner.start_date || banner.end_date">
                · {{ banner.start_date || '–' }} ~ {{ banner.end_date || '무기한' }}
              </template>
            </p>
          </div>
          <!-- 액션 버튼 -->
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" @click="toggleActive(banner)"
              :class="['px-3 py-1.5 rounded-lg text-sm font-bold transition cursor-pointer', banner.is_active ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700']">
              {{ banner.is_active ? '비활성화' : '활성화' }}
            </button>
            <button type="button" @click="openEditModal(banner)"
              class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold transition cursor-pointer">
              수정
            </button>
            <button type="button" @click="deleteBanner(banner)"
              class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold transition cursor-pointer">
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 카드 B 헤더: 섹션 키워드 풀 -->
    <div class="flex items-center justify-between pt-2">
      <div>
        <h2 class="text-xl font-black text-slate-900">섹션 키워드 풀</h2>
        <p class="text-base text-slate-500 mt-0.5">
          홈 섹션 6개가 매일(날짜 기반 자동 로테이션, 크론 없음) 순서대로 아래 키워드로 1688 검색을 수행합니다.
          섹션당 활성 항목이 하나도 없으면 코드 내장 폴백 키워드가 대신 사용됩니다.
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0 ml-4">
        <button type="button" @click="invalidateTodaySectionCache" :disabled="isCacheInvalidating"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold text-base transition cursor-pointer">
          <i :class="['fas text-sm', isCacheInvalidating ? 'fa-spinner fa-spin' : 'fa-rotate']"></i>
          오늘 캐시 초기화
        </button>
        <button type="button" @click="openAddPoolModal"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-base shadow-sm transition cursor-pointer">
          <i class="fas fa-plus text-sm"></i>
          키워드 추가
        </button>
      </div>
    </div>
    <p v-if="cacheInvalidateStatus" class="text-sm -mt-3" :class="cacheInvalidateStatus.ok ? 'text-emerald-600' : 'text-rose-600'">
      {{ cacheInvalidateStatus.message }}
    </p>

    <!-- 카드 B: 섹션 키워드 풀 목록 -->
    <div class="space-y-4">
      <!-- 섹션 선택 pill -->
      <div class="flex items-center gap-2 flex-wrap">
        <button v-for="opt in SECTION_OPTIONS" :key="opt.value" type="button"
          @click="selectedPoolSection = opt.value"
          :class="['px-3 py-1.5 rounded-full text-sm font-bold border transition cursor-pointer',
            selectedPoolSection === opt.value ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300']">
          {{ opt.label }}
        </button>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div v-if="isPoolLoading" class="p-8 text-center text-slate-400">
          <i class="fas fa-spinner fa-spin text-2xl mb-2 block"></i>불러오는 중...
        </div>
        <div v-else-if="filteredPoolItems.length === 0" class="p-10 text-center text-slate-400">
          <i class="fas fa-tags text-4xl mb-3 block text-slate-200"></i>
          <p class="font-bold">이 섹션에 등록된 키워드가 없습니다.</p>
          <p class="text-base mt-1">코드 내장 폴백 키워드로 동작 중입니다. "키워드 추가"로 등록해 보세요.</p>
        </div>
        <div v-else class="divide-y divide-slate-100">
          <div v-for="(item, idx) in filteredPoolItems" :key="item.id"
            class="flex items-center gap-4 p-4 hover:bg-slate-50 transition">
            <!-- 순서 이동 -->
            <div class="flex flex-col gap-0.5 shrink-0">
              <button type="button" @click="movePoolItem(item, -1)" :disabled="idx === 0"
                class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 text-sm cursor-pointer">▲</button>
              <button type="button" @click="movePoolItem(item, 1)" :disabled="idx === filteredPoolItems.length - 1"
                class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 text-sm cursor-pointer">▼</button>
            </div>
            <!-- 썸네일 -->
            <div class="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
              <img v-if="item.banner_image_url" :src="item.banner_image_url" alt="배너"
                class="w-full h-full object-cover" @error="handleImgError" />
              <i v-else class="fas fa-image text-slate-300"></i>
            </div>
            <!-- 정보 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-bold text-slate-800 text-base truncate">{{ item.keyword }}</p>
                <span :class="['px-2 py-0.5 rounded text-xs font-bold', item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500']">
                  {{ item.is_active ? '활성' : '비활성' }}
                </span>
                <span v-if="isTodaysPoolPick(item)" class="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                  오늘 선택됨
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">순서 {{ idx + 1 }} / {{ filteredPoolItems.length }}</p>
            </div>
            <!-- 액션 버튼 -->
            <div class="flex items-center gap-2 shrink-0">
              <button type="button" @click="togglePoolActive(item)"
                :class="['px-3 py-1.5 rounded-lg text-sm font-bold transition cursor-pointer', item.is_active ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700']">
                {{ item.is_active ? '비활성화' : '활성화' }}
              </button>
              <button type="button" @click="openEditPoolModal(item)"
                class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold transition cursor-pointer">
                수정
              </button>
              <button type="button" @click="deletePoolItem(item)"
                class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold transition cursor-pointer">
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 배너 추가/수정 모달 -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="closeModal">
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-black text-slate-900">{{ editingBanner ? '배너 수정' : '배너 추가' }}</h2>
              <button @click="closeModal" class="text-slate-400 hover:text-slate-600 p-1 cursor-pointer text-lg">✕</button>
            </div>

            <!-- 배너 유형: 상단 히어로(왼쪽/오른쪽 칸) vs 홈 섹션 테마 배너 -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">배너 유형 <span class="text-rose-500">*</span></label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  :class="['flex flex-col gap-0.5 p-3 rounded-xl border-2 cursor-pointer transition',
                    !form.section_key ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300 bg-white']"
                >
                  <input type="radio" :checked="!form.section_key" @change="form.section_key = null" class="sr-only" />
                  <span :class="['text-sm font-black', !form.section_key ? 'text-slate-800' : 'text-slate-700']">상단 히어로 배너</span>
                  <span class="text-xs text-slate-400 font-medium">메인 상단 왼쪽/오른쪽 칸</span>
                </label>
                <label
                  :class="['flex flex-col gap-0.5 p-3 rounded-xl border-2 cursor-pointer transition',
                    form.section_key ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300 bg-white']"
                >
                  <input type="radio" :checked="!!form.section_key" @change="form.section_key = form.section_key || SECTION_OPTIONS[0].value" class="sr-only" />
                  <span :class="['text-sm font-black', form.section_key ? 'text-purple-700' : 'text-slate-700']">홈 섹션 테마 배너</span>
                  <span class="text-xs text-slate-400 font-medium">6개 테마 섹션 옆 배너</span>
                </label>
              </div>
            </div>

            <!-- 히어로 배너: 왼쪽/오른쪽 칸 선택 -->
            <div v-if="!form.section_key">
              <label class="block text-sm font-bold text-slate-700 mb-1.5">노출 칸 <span class="text-rose-500">*</span></label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="opt in [{ value: 'left', label: '왼쪽 칸', sub: '어두운 OEM 카드 영역', color: 'indigo' }, { value: 'right', label: '오른쪽 칸', sub: '주황 프로모 카드 영역', color: 'orange' }]"
                  :key="opt.value"
                  :class="['flex flex-col gap-0.5 p-3 rounded-xl border-2 cursor-pointer transition',
                    form.slot === opt.value
                      ? (opt.color === 'indigo' ? 'border-indigo-500 bg-indigo-50' : 'border-orange-500 bg-orange-50')
                      : 'border-slate-200 hover:border-slate-300 bg-white']"
                >
                  <input type="radio" v-model="form.slot" :value="opt.value" class="sr-only" />
                  <span :class="['text-sm font-black', form.slot === opt.value ? (opt.color === 'indigo' ? 'text-indigo-700' : 'text-orange-700') : 'text-slate-700']">{{ opt.label }}</span>
                  <span class="text-xs text-slate-400 font-medium">{{ opt.sub }}</span>
                </label>
              </div>
            </div>

            <!-- 섹션 배너: 어느 테마 섹션에 붙을지 선택 -->
            <div v-else>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">노출 섹션 <span class="text-rose-500">*</span></label>
              <select v-model="form.section_key" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition">
                <option v-for="opt in SECTION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <p class="text-xs text-slate-400 mt-1">섹션당 1건만 노출됩니다(노출순서가 가장 낮은 배너 우선). 배너 좌/우 위치는 섹션 순서에 따라 자동 결정됩니다.</p>
            </div>

            <!-- 이미지 업로드 -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">배너 이미지 <span class="text-slate-400 font-medium">(없으면 그라데이션 배경 사용)</span></label>
              <div class="relative">
                <div v-if="form.image_url" class="mb-2 rounded-xl overflow-hidden bg-slate-100 h-32 relative">
                  <img :src="form.image_url" alt="미리보기" class="w-full h-full object-cover" />
                  <button @click="form.image_url = ''" class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white text-sm hover:bg-black/70 flex items-center justify-center cursor-pointer">✕</button>
                </div>
                <label class="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl cursor-pointer transition text-base text-slate-500 hover:text-blue-600">
                  <i class="fas fa-cloud-upload-alt"></i>
                  <span>{{ isUploading ? '업로드 중...' : '이미지 클릭하여 업로드 (JPEG/PNG/WebP, 5MB 이하)' }}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handleImageUpload" :disabled="isUploading" />
                </label>
              </div>
            </div>

            <!-- 링크 URL -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">클릭 링크 URL</label>
              <input v-model="form.link_url" type="text" placeholder="예: /services/trade-agent 또는 https://..." class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition" />
            </div>

            <!-- 링크 유형 -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">링크 유형</label>
              <div class="flex gap-3">
                <label v-for="opt in [{ value: 'internal', label: '내부 라우트 (Vue Router)' }, { value: 'external', label: '외부 링크 (새 탭)' }]" :key="opt.value"
                  class="flex items-center gap-2 cursor-pointer text-base">
                  <input type="radio" v-model="form.link_type" :value="opt.value" class="accent-blue-600" />
                  {{ opt.label }}
                </label>
              </div>
            </div>

            <!-- 관리용 제목 -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">관리용 제목 (배너에 미노출)</label>
              <input v-model="form.title" type="text" placeholder="예: OEM/ODM 배너 2026년 9월" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition" />
            </div>

            <!-- 서브 문구 (레거시 — 호환 유지) -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">서브 문구 <span class="text-slate-400 font-medium">(하단 자막, 선택)</span></label>
              <input v-model="form.subtitle" type="text" placeholder="예: 2026 베스트 소싱 기획전 – 지금 확인하세요" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition" />
            </div>

            <!-- 카드 텍스트 콘텐츠 구분선 -->
            <div class="border-t border-slate-100 pt-1">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">카드 텍스트 콘텐츠</p>

              <!-- 라벨 뱃지 -->
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1.5">상단 라벨 뱃지 <span class="text-slate-400 font-medium">(예: B2B CUSTOM MADE)</span></label>
                  <input v-model="form.label" type="text" placeholder="예: B2B CUSTOM MADE / 2026 베스트 소싱 기획전" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition" />
                </div>

                <!-- 제목 (heading) -->
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1.5">카드 큰 제목 <span class="text-slate-400 font-medium">(예: OEM / ODM 제작관)</span></label>
                  <input v-model="form.heading" type="text" placeholder="예: OEM / ODM 제작관" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition" />
                </div>

                <!-- 설명 문구 -->
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1.5">설명 문구</label>
                  <textarea v-model="form.description" rows="2" placeholder="예: 로고 인쇄, 커스텀 패키지, 금형 사출 제작까지 1:1 밀착 대행합니다." class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition resize-none"></textarea>
                </div>

                <!-- CTA 버튼 -->
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1.5">버튼 문구</label>
                    <input v-model="form.button_text" type="text" placeholder="예: 맞춤 제작 상담 신청" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition" />
                  </div>
                  <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1.5">버튼 링크</label>
                    <input v-model="form.button_url" type="text" placeholder="예: /services/trade-agent" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 노출 순서 -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">노출 순서 (낮을수록 먼저)</label>
                <input v-model.number="form.display_order" type="number" min="0" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">활성 상태</label>
                <div class="flex items-center h-10">
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="form.is_active" class="sr-only peer" />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                    <span class="ml-2 text-base font-medium text-slate-700">{{ form.is_active ? '활성' : '비활성' }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 노출 기간 (선택) -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">노출 시작일 (선택)</label>
                <input v-model="form.start_date" type="date" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">노출 종료일 (선택)</label>
                <input v-model="form.end_date" type="date" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-blue-500 transition" />
              </div>
            </div>

            <!-- 에러 메시지 -->
            <p v-if="formError" class="text-sm text-rose-600 font-bold">{{ formError }}</p>

            <!-- 저장 버튼 -->
            <div class="flex gap-3 pt-2">
              <button type="button" @click="closeModal" class="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-50 transition cursor-pointer">취소</button>
              <button type="button" @click="saveBanner" :disabled="isSaving"
                class="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-base shadow-sm transition cursor-pointer flex items-center justify-center gap-2">
                <i v-if="isSaving" class="fas fa-spinner fa-spin text-sm"></i>
                {{ isSaving ? '저장 중...' : (editingBanner ? '수정 저장' : '배너 추가') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- 섹션 키워드 풀 추가/수정 모달 -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="isPoolModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="closePoolModal">
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div class="flex items-center justify-between">
              <h2 class="text-base font-black text-slate-900">{{ editingPoolItem ? '키워드 수정' : '키워드 추가' }}</h2>
              <button @click="closePoolModal" class="text-slate-400 hover:text-slate-600 p-1 cursor-pointer text-lg">✕</button>
            </div>

            <!-- 노출 섹션 -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">노출 섹션 <span class="text-rose-500">*</span></label>
              <select v-model="poolForm.section_key" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-purple-500 transition">
                <option v-for="opt in SECTION_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <!-- 검색 키워드 -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">1688 검색 키워드(한글 또는 중국어) <span class="text-rose-500">*</span></label>
              <input v-model="poolForm.keyword" type="text" placeholder="예: 보조배터리 또는 充电宝" class="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-purple-500 transition" />
              <p class="text-xs text-slate-400 mt-1">한글 입력 시 사전/번역 API로 중국어 변환, 중국어 직접 입력 시 그대로 검색에 사용됩니다.</p>
            </div>

            <!-- 배너 이미지 업로드 (선택) -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">이 키워드가 선택된 날 노출할 배너 이미지 <span class="text-slate-400 font-medium">(선택, 없으면 섹션 고정배너 유지)</span></label>
              <p class="text-xs text-slate-500 mb-2 leading-relaxed">
                권장 업로드 규격: <span class="font-bold text-slate-700">400 × 900px (세로형, 비율 4:9)</span> —
                PC에서는 이 비율 그대로, 모바일에서는 배너가 가로로 짧아져(16:9) 자동으로 다시 크롭됩니다.
                다른 비율을 올려도 레이아웃이 깨지지 않고 가운데 기준으로 잘려서 채워집니다.
              </p>
              <div class="relative">
                <div v-if="poolForm.banner_image_url" class="mb-2 flex items-start gap-3">
                  <div class="w-28 aspect-[4/9] rounded-xl overflow-hidden bg-slate-100 relative shrink-0">
                    <img :src="poolForm.banner_image_url" alt="PC 크롭 미리보기" class="w-full h-full object-cover" />
                    <button @click="poolForm.banner_image_url = ''" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-sm hover:bg-black/70 flex items-center justify-center cursor-pointer">✕</button>
                  </div>
                  <div class="flex-1 aspect-video rounded-xl overflow-hidden bg-slate-100 relative">
                    <img :src="poolForm.banner_image_url" alt="모바일 크롭 미리보기" class="w-full h-full object-cover" />
                  </div>
                </div>
                <p v-if="poolForm.banner_image_url" class="text-xs text-slate-400 mb-2">왼쪽: PC(4:9) 크롭 미리보기 · 오른쪽: 모바일(16:9) 크롭 미리보기</p>
                <label class="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-xl cursor-pointer transition text-base text-slate-500 hover:text-purple-600">
                  <i class="fas fa-cloud-upload-alt"></i>
                  <span>{{ isPoolUploading ? '업로드 중...' : '이미지 클릭하여 업로드 (JPEG/PNG/WebP, 5MB 이하)' }}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="handlePoolImageUpload" :disabled="isPoolUploading" />
                </label>
              </div>
            </div>

            <!-- 활성 상태 -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-1.5">활성 상태</label>
              <div class="flex items-center h-10">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="poolForm.is_active" class="sr-only peer" />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  <span class="ml-2 text-base font-medium text-slate-700">{{ poolForm.is_active ? '활성' : '비활성' }}</span>
                </label>
              </div>
              <p class="text-xs text-slate-400 mt-1">비활성 항목은 로테이션 대상에서 제외됩니다(순서/인덱스도 재계산됨).</p>
            </div>

            <!-- 에러 메시지 -->
            <p v-if="poolFormError" class="text-sm text-rose-600 font-bold">{{ poolFormError }}</p>

            <!-- 저장 버튼 -->
            <div class="flex gap-3 pt-2">
              <button type="button" @click="closePoolModal" class="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-50 transition cursor-pointer">취소</button>
              <button type="button" @click="savePoolItem" :disabled="isPoolSaving"
                class="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-base shadow-sm transition cursor-pointer flex items-center justify-center gap-2">
                <i v-if="isPoolSaving" class="fas fa-spinner fa-spin text-sm"></i>
                {{ isPoolSaving ? '저장 중...' : (editingPoolItem ? '수정 저장' : '키워드 추가') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'

const banners = ref([])
const isLoading = ref(false)
const isModalOpen = ref(false)
const isSaving = ref(false)
const isUploading = ref(false)
const editingBanner = ref(null)
const formError = ref('')

// 홈 섹션 테마 배너용 section_key 옵션 — MallView.vue의 HOME_SECTION_POOLS/sectionDefs와 동일한 6개 id/라벨
const SECTION_OPTIONS = [
  { value: 'md',      label: '🔥 오늘의 MD 추천 베스트' },
  { value: 'fashion', label: '👗 트렌드 패션 기획전' },
  { value: 'living',  label: '🏠 생활 & 주방 아이디어 잡화' },
  { value: 'sports',  label: '⛺ 스포츠/레저 & 캠핑 테마관' },
  { value: 'digital', label: '📱 디지털/가전 잇템' },
  { value: 'beauty',  label: '💄 뷰티 & 화장품 셀렉트' },
]
const SECTION_LABELS = Object.fromEntries(SECTION_OPTIONS.map(o => [o.value, o.label]))

const defaultForm = () => ({
  slot: 'left',
  section_key: null,
  image_url: '',
  link_url: '',
  link_type: 'internal',
  title: '',
  subtitle: '',
  label: '',
  heading: '',
  description: '',
  button_text: '',
  button_url: '',
  display_order: 0,
  is_active: true,
  start_date: null,
  end_date: null
})
const form = ref(defaultForm())

async function loadBanners() {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('display_order', { ascending: true })
    if (!error && data) banners.value = data
  } finally {
    isLoading.value = false
  }
}

function openAddModal() {
  editingBanner.value = null
  form.value = defaultForm()
  formError.value = ''
  isModalOpen.value = true
}

function openEditModal(banner) {
  editingBanner.value = banner
  form.value = { ...banner }
  formError.value = ''
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  editingBanner.value = null
  formError.value = ''
}

async function handleImageUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    formError.value = '5MB 이하의 이미지만 업로드 가능합니다.'
    return
  }
  isUploading.value = true
  formError.value = ''
  try {
    const ext = file.name.split('.').pop()
    const fileName = `banner_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('banners')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(data.path)
    form.value.image_url = urlData.publicUrl
  } catch (err) {
    formError.value = '이미지 업로드 실패: ' + (err.message || '알 수 없는 오류')
  } finally {
    isUploading.value = false
  }
}

async function saveBanner() {
  if (!form.value.image_url) {
    formError.value = '배너 이미지를 업로드해 주세요.'
    return
  }
  isSaving.value = true
  formError.value = ''
  try {
    const payload = { ...form.value }
    if (!payload.start_date) payload.start_date = null
    if (!payload.end_date) payload.end_date = null

    let error
    if (editingBanner.value) {
      ;({ error } = await supabase.from('banners').update(payload).eq('id', editingBanner.value.id))
    } else {
      delete payload.id
      ;({ error } = await supabase.from('banners').insert(payload))
    }
    if (error) throw error
    closeModal()
    await loadBanners()
  } catch (err) {
    formError.value = '저장 실패: ' + (err.message || '알 수 없는 오류')
  } finally {
    isSaving.value = false
  }
}

async function toggleActive(banner) {
  const { error } = await supabase.from('banners').update({ is_active: !banner.is_active }).eq('id', banner.id)
  if (!error) banner.is_active = !banner.is_active
}

async function deleteBanner(banner) {
  if (!confirm(`"${banner.title || '이 배너'}"를 삭제하시겠습니까?`)) return
  const { error } = await supabase.from('banners').delete().eq('id', banner.id)
  if (!error) banners.value = banners.value.filter(b => b.id !== banner.id)
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&auto=format&fit=crop&q=60'
}

// ============================================================
// 섹션 키워드 풀 관리 (section_keyword_pools 테이블)
// MallView.vue의 홈 섹션 6개가 매일 이 테이블에서 활성 키워드를 로테이션함
// ============================================================
const keywordPools = ref([])
const isPoolLoading = ref(false)
const selectedPoolSection = ref(SECTION_OPTIONS[0].value)
const isPoolModalOpen = ref(false)
const isPoolSaving = ref(false)
const isPoolUploading = ref(false)
const editingPoolItem = ref(null)
const poolFormError = ref('')

const defaultPoolForm = () => ({
  section_key: selectedPoolSection.value,
  keyword: '',
  banner_image_url: '',
  sort_order: 0,
  is_active: true,
})
const poolForm = ref(defaultPoolForm())

const filteredPoolItems = computed(() =>
  keywordPools.value
    .filter(p => p.section_key === selectedPoolSection.value)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
)

// MallView.vue getTodayIndex()와 동일한 순수 계산식(날짜→일련번호→나머지) — 관리자 화면에
// "오늘 어떤 항목이 실제로 선택되는지" 미리 보여주기 위한 것으로, 실제 로테이션은 프론트 쪽에서 계산됨
function getTodayIndex(len) {
  const now = new Date()
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  return dayOfYear % len
}

function isTodaysPoolPick(item) {
  if (!item.is_active) return false
  const activeList = filteredPoolItems.value.filter(p => p.is_active)
  if (activeList.length === 0) return false
  const idx = getTodayIndex(activeList.length)
  return activeList[idx]?.id === item.id
}

// 몰메인 서버 공용 캐시(home_section_cache) 오늘자 강제 초기화 — 관리자가 키워드/배너를
// 바꾼 직후 "오늘 이미 캐시된 옛 결과"가 그대로 노출되는 걸 막기 위한 수동 무효화 버튼.
// 삭제만 하면 다음 방문자가 loadHomeSections()에서 캐시 미스로 판단해 자동으로 재수집함.
// home_section_cache는 RLS로 anon 직접 접근이 막혀 있어, 반드시 api/home-section-cache.js
// DELETE(관리자 세션 토큰 검증)를 거쳐야 한다 — api/1688-order-create.js 호출 패턴과 동일하게
// supabase.auth.getSession()의 access_token을 Authorization: Bearer로 전달.
const isCacheInvalidating = ref(false)
const cacheInvalidateStatus = ref(null)

async function invalidateTodaySectionCache() {
  if (!confirm('오늘 저장된 몰메인 6섹션 서버 캐시를 모두 삭제하시겠습니까?\n다음 방문자부터 1688 검색이 다시 실행됩니다.')) return
  isCacheInvalidating.value = true
  cacheInvalidateStatus.value = null
  try {
    const today = new Date().toISOString().slice(0, 10)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('관리자 세션이 없습니다. 다시 로그인해 주세요.')

    const res = await fetch(`/api/home-section-cache?date=${encodeURIComponent(today)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
    const json = await res.json().catch(() => null)
    if (!json?.success) throw new Error(json?.message || `HTTP ${res.status}`)
    cacheInvalidateStatus.value = { ok: true, message: '오늘자 캐시를 초기화했습니다. 다음 방문자부터 새로 수집됩니다.' }
  } catch (err) {
    cacheInvalidateStatus.value = { ok: false, message: '초기화 실패: ' + (err.message || '알 수 없는 오류') }
  } finally {
    isCacheInvalidating.value = false
  }
}

async function loadKeywordPools() {
  isPoolLoading.value = true
  try {
    const { data, error } = await supabase
      .from('section_keyword_pools')
      .select('*')
      .order('section_key', { ascending: true })
      .order('sort_order', { ascending: true })
    if (!error && data) keywordPools.value = data
  } finally {
    isPoolLoading.value = false
  }
}

function openAddPoolModal() {
  editingPoolItem.value = null
  poolForm.value = defaultPoolForm()
  poolFormError.value = ''
  isPoolModalOpen.value = true
}

function openEditPoolModal(item) {
  editingPoolItem.value = item
  poolForm.value = { ...item }
  poolFormError.value = ''
  isPoolModalOpen.value = true
}

function closePoolModal() {
  isPoolModalOpen.value = false
  editingPoolItem.value = null
  poolFormError.value = ''
}

async function handlePoolImageUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    poolFormError.value = '5MB 이하의 이미지만 업로드 가능합니다.'
    return
  }
  isPoolUploading.value = true
  poolFormError.value = ''
  try {
    const ext = file.name.split('.').pop()
    const fileName = `pool_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('banners')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('banners').getPublicUrl(data.path)
    poolForm.value.banner_image_url = urlData.publicUrl
  } catch (err) {
    poolFormError.value = '이미지 업로드 실패: ' + (err.message || '알 수 없는 오류')
  } finally {
    isPoolUploading.value = false
  }
}

async function savePoolItem() {
  if (!poolForm.value.keyword || !poolForm.value.keyword.trim()) {
    poolFormError.value = '키워드를 입력해 주세요.'
    return
  }
  isPoolSaving.value = true
  poolFormError.value = ''
  try {
    const payload = { ...poolForm.value }
    if (!editingPoolItem.value) {
      // 신규 추가 시 해당 섹션의 마지막 순서 다음으로 자동 배치
      const sectionItems = keywordPools.value.filter(p => p.section_key === payload.section_key)
      payload.sort_order = sectionItems.length > 0 ? Math.max(...sectionItems.map(p => p.sort_order)) + 1 : 0
    }

    let error
    if (editingPoolItem.value) {
      ;({ error } = await supabase.from('section_keyword_pools').update(payload).eq('id', editingPoolItem.value.id))
    } else {
      delete payload.id
      ;({ error } = await supabase.from('section_keyword_pools').insert(payload))
    }
    if (error) throw error
    closePoolModal()
    await loadKeywordPools()
  } catch (err) {
    poolFormError.value = '저장 실패: ' + (err.message || '알 수 없는 오류')
  } finally {
    isPoolSaving.value = false
  }
}

async function togglePoolActive(item) {
  const { error } = await supabase.from('section_keyword_pools').update({ is_active: !item.is_active }).eq('id', item.id)
  if (!error) item.is_active = !item.is_active
}

async function deletePoolItem(item) {
  if (!confirm(`"${item.keyword}" 키워드를 삭제하시겠습니까?`)) return
  const { error } = await supabase.from('section_keyword_pools').delete().eq('id', item.id)
  if (!error) keywordPools.value = keywordPools.value.filter(p => p.id !== item.id)
}

// 같은 섹션 내 인접 항목과 sort_order를 맞바꿔 순서 이동 (드래그 없이 안정적으로 구현)
async function movePoolItem(item, direction) {
  const list = filteredPoolItems.value
  const idx = list.findIndex(p => p.id === item.id)
  const targetIdx = idx + direction
  if (targetIdx < 0 || targetIdx >= list.length) return
  const target = list[targetIdx]
  const itemNewOrder = target.sort_order
  const targetNewOrder = item.sort_order
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from('section_keyword_pools').update({ sort_order: itemNewOrder }).eq('id', item.id),
    supabase.from('section_keyword_pools').update({ sort_order: targetNewOrder }).eq('id', target.id),
  ])
  if (!e1 && !e2) {
    item.sort_order = itemNewOrder
    target.sort_order = targetNewOrder
  }
}

onMounted(() => {
  loadBanners()
  loadKeywordPools()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
