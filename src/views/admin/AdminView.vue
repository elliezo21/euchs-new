<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 font-sans">
    
    <!-- Top Admin Header -->
    <header class="bg-slate-950/80 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <div class="flex items-center gap-3">
          <router-link to="/" class="flex items-center gap-2 group">
            <span class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-105 transition">
              E
            </span>
            <span class="text-lg font-black tracking-tight text-white">
              EUC <span class="text-blue-400">ADMIN</span>
            </span>
          </router-link>

          <span class="hidden sm:inline-block text-xs px-2.5 py-1 rounded-full border"
            :class="isDbConnected 
              ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' 
              : 'bg-amber-950/60 border-amber-500/30 text-amber-400'"
          >
            <i class="fas fa-circle text-[8px] mr-1" :class="isDbConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'"></i>
            {{ isDbConnected ? 'Supabase DB 연동됨' : 'DB 설정 필요 (.env)' }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <button 
            @click="showSchemaModal = true" 
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
          >
            <i class="fas fa-database text-blue-400"></i>
            <span>SQL & Storage 스키마</span>
          </button>

          <router-link 
            to="/" 
            class="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold border border-blue-500/30 flex items-center gap-1.5 transition"
          >
            <i class="fas fa-external-link-alt"></i>
            <span>사용자 웹사이트 보기</span>
          </router-link>
        </div>

      </div>
    </header>

    <!-- Main Container -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Tab Navigation -->
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-4">
        
        <!-- Tab 1: Applications -->
        <button 
          @click="activeTab = 'applications'"
          class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2"
          :class="activeTab === 'applications' 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'"
        >
          <i class="fas fa-clipboard-list"></i>
          <span>고객 신청 접수 현황</span>
          <span v-if="applications.length > 0" class="px-2 py-0.5 text-xs rounded-full bg-white/20 text-white font-black">
            {{ applications.length }}
          </span>
        </button>

        <!-- Tab 2: Notices -->
        <button 
          @click="activeTab = 'notices'"
          class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2"
          :class="activeTab === 'notices' 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'"
        >
          <i class="fas fa-bullhorn"></i>
          <span>공지사항 관리</span>
          <span v-if="notices.length > 0" class="px-2 py-0.5 text-xs rounded-full bg-white/20 text-white font-black">
            {{ notices.length }}
          </span>
        </button>

        <!-- Tab 3: Exchange Rate & Fee Settings -->
        <button 
          @click="activeTab = 'settings'"
          class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2"
          :class="activeTab === 'settings' 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
            : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'"
        >
          <i class="fas fa-sliders text-amber-400"></i>
          <span>환율 및 수수료 설정</span>
          <span class="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            {{ settingsForm.exchange_rate }}원
          </span>
        </button>

      </div>

      <!-- ========================================================== -->
      <!-- TAB 1: 고객 신청 접수 현황 -->
      <!-- ========================================================== -->
      <section v-if="activeTab === 'applications'" class="space-y-6">
        
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
            <span class="text-xs text-slate-400 block mb-1">총 접수 건수</span>
            <span class="text-2xl font-black text-white">{{ applications.length }}건</span>
          </div>

          <div class="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
            <span class="text-xs text-slate-400 block mb-1">접수 대기</span>
            <span class="text-2xl font-black text-amber-400">{{ getStatusCount('접수대기') }}건</span>
          </div>

          <div class="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
            <span class="text-xs text-slate-400 block mb-1">상담 진행 중</span>
            <span class="text-2xl font-black text-sky-400">{{ getStatusCount('상담진행') }}건</span>
          </div>

          <div class="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
            <span class="text-xs text-slate-400 block mb-1">견적 / 처리 완료</span>
            <span class="text-2xl font-black text-emerald-400">{{ getStatusCount('견적완료') + getStatusCount('처리완료') }}건</span>
          </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 flex flex-wrap items-center justify-between gap-4">
          
          <!-- Service Filter -->
          <div class="flex flex-wrap items-center gap-1.5">
            <button 
              v-for="filter in appFilters" 
              :key="filter.id"
              @click="currentAppFilter = filter.id"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              :class="currentAppFilter === filter.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'"
            >
              {{ filter.name }}
            </button>
          </div>

          <!-- Search & Refresh -->
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <div class="relative w-full sm:w-60">
              <input 
                v-model="appSearchQuery" 
                type="text" 
                placeholder="고객명, 연락처 검색..."
                class="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 outline-none"
              />
              <i class="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            </div>

            <button 
              @click="fetchApplications" 
              class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-slate-200 flex items-center gap-1 transition"
              title="새로고침"
            >
              <i class="fas fa-sync-alt text-xs" :class="{ 'animate-spin': isAppLoading }"></i>
              <span>새로고침</span>
            </button>
          </div>

        </div>

        <!-- Applications Table -->
        <div class="bg-slate-800/60 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950/60 text-slate-400 font-bold uppercase text-[11px] border-b border-slate-700">
                <tr>
                  <th class="py-3 px-4 w-12 text-center">No</th>
                  <th class="py-3 px-4 min-w-[130px]">신청 서비스</th>
                  <th class="py-3 px-4 min-w-[120px]">고객명 / 상호</th>
                  <th class="py-3 px-4 min-w-[120px]">연락처</th>
                  <th class="py-3 px-4 min-w-[110px] text-right">예상 견적 / 금액</th>
                  <th class="py-3 px-4 min-w-[130px] text-center">처리 상태</th>
                  <th class="py-3 px-4 min-w-[110px]">신청 일시</th>
                  <th class="py-3 px-4 min-w-[130px] text-center">관리</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700/50 bg-slate-900/40">
                <tr v-if="isAppLoading">
                  <td colspan="8" class="py-12 text-center text-slate-400">
                    <i class="fas fa-spinner fa-spin text-xl mb-2 block text-blue-400"></i>
                    접수 목록을 불러오는 중입니다...
                  </td>
                </tr>
                <tr v-else-if="filteredApplications.length === 0">
                  <td colspan="8" class="py-12 text-center text-slate-500">
                    <i class="fas fa-inbox text-3xl mb-2 block text-slate-600"></i>
                    접수된 신청 내역이 없습니다.
                  </td>
                </tr>
                <tr v-for="(app, idx) in filteredApplications" :key="app.id" class="hover:bg-slate-800/80 transition">
                  <td class="py-3 px-4 text-center font-bold text-slate-500">{{ idx + 1 }}</td>
                  
                  <td class="py-3 px-4 font-semibold">
                    <span 
                      class="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold"
                      :class="getServiceBadgeClass(app.service_type)"
                    >
                      {{ app.service_name || getServiceName(app.service_type) }}
                    </span>
                  </td>

                  <td class="py-3 px-4 font-bold text-white">
                    {{ app.customer_name }}
                  </td>

                  <td class="py-3 px-4">
                    <a :href="`tel:${app.phone}`" class="text-blue-400 hover:underline">
                      {{ app.phone }}
                    </a>
                  </td>

                  <td class="py-3 px-4 text-right font-bold text-amber-400">
                    {{ (Number(app.total_amount) || 0) > 0 ? Number(app.total_amount).toLocaleString() + '원' : '상담 후 정산' }}
                  </td>

                  <!-- Status Select -->
                  <td class="py-3 px-4 text-center">
                    <select 
                      v-model="app.status" 
                      @change="updateAppStatus(app)"
                      class="px-2.5 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer"
                      :class="getStatusSelectClass(app.status)"
                    >
                      <option value="접수대기">접수대기</option>
                      <option value="상담진행">상담진행</option>
                      <option value="견적완료">견적완료</option>
                      <option value="처리완료">처리완료</option>
                    </select>
                  </td>

                  <td class="py-3 px-4 text-slate-400 text-[11px]">
                    {{ formatDateTime(app.created_at) }}
                  </td>

                  <!-- Actions -->
                  <td class="py-3 px-4 text-center space-x-1.5">
                    <button 
                      @click="openAppDetail(app)"
                      class="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white transition text-xs font-semibold"
                    >
                      <i class="fas fa-eye"></i> 상세내역
                    </button>
                    <button 
                      @click="deleteApplication(app.id)"
                      class="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="삭제"
                    >
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </section>

      <!-- ========================================================== -->
      <!-- TAB 2: 공지사항 관리 (CRUD & Storage 이미지 업로드) -->
      <!-- ========================================================== -->
      <section v-if="activeTab === 'notices'" class="space-y-8">
        
        <!-- Notice Write / Edit Form -->
        <div class="bg-slate-800/60 rounded-3xl p-6 sm:p-8 border border-slate-700/50 shadow-xl space-y-6">
          <div class="flex items-center justify-between border-b border-slate-700 pb-4">
            <h3 class="text-base font-black text-white flex items-center gap-2">
              <i class="fas fa-pen-to-square text-blue-400"></i>
              <span>{{ editingNoticeId ? '공지사항 수정하기' : '신규 공지사항 등록' }}</span>
            </h3>
            <button 
              v-if="editingNoticeId" 
              @click="resetNoticeForm"
              class="text-xs text-slate-400 hover:text-slate-200"
            >
              <i class="fas fa-times"></i> 수정 취소 (신규 등록으로 전환)
            </button>
          </div>

          <form @submit.prevent="saveNotice" class="space-y-4 text-xs">
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-slate-300 font-bold mb-1">공지사항 제목 (title) *</label>
                <input 
                  v-model="noticeForm.title" 
                  type="text" 
                  required 
                  placeholder="공지사항 제목을 입력하세요"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 outline-none text-xs sm:text-sm"
                />
              </div>

              <div>
                <label class="block text-slate-300 font-bold mb-1">카테고리 (category) *</label>
                <select 
                  v-model="noticeForm.category" 
                  @change="onCategoryChange"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 outline-none text-xs sm:text-sm cursor-pointer"
                >
                  <option value="schedule">업무일정 (schedule)</option>
                  <option value="logistics">통관·물류 (logistics)</option>
                  <option value="event">이벤트 (event)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <!-- 뱃지 문구 -->
              <div class="sm:col-span-3">
                <label class="block text-slate-300 font-bold mb-1">뱃지 문구 (badge)</label>
                <input 
                  v-model="noticeForm.badge" 
                  type="text" 
                  placeholder="예: 공지, 안내, 물류, 이벤트"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 outline-none"
                />
              </div>

              <!-- 썸네일 이미지 & 직접 업로드 버튼 -->
              <div class="sm:col-span-6">
                <label class="block text-slate-300 font-bold mb-1">
                  썸네일 이미지 (thumbnail_url)
                </label>
                <div class="flex items-center gap-2">
                  <input 
                    v-model="noticeForm.thumbnail_url" 
                    type="url" 
                    placeholder="https://... (또는 우측 버튼으로 직접 파일 업로드)"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 outline-none"
                  />
                  
                  <!-- 업로드 트리거 버튼 -->
                  <button 
                    type="button" 
                    @click="triggerImageSelect"
                    :disabled="isUploadingImage"
                    class="shrink-0 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 font-bold rounded-xl border border-slate-700 hover:border-blue-500 transition flex items-center gap-1.5 disabled:opacity-50"
                    title="이미지 파일 직접 업로드 (Supabase Storage)"
                  >
                    <i v-if="isUploadingImage" class="fas fa-spinner animate-spin"></i>
                    <i v-else class="fas fa-cloud-arrow-up"></i>
                    <span class="hidden sm:inline">{{ isUploadingImage ? '업로드 중...' : '이미지 업로드' }}</span>
                  </button>

                  <!-- 숨겨진 파일 인풋 -->
                  <input 
                    type="file" 
                    ref="imageFileInput" 
                    accept="image/*" 
                    @change="handleStorageImageUpload" 
                    class="hidden" 
                  />
                </div>

                <!-- 실시간 썸네일 미리보기 카드 -->
                <div v-if="noticeForm.thumbnail_url" class="mt-2.5 flex items-center gap-3 p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <img 
                    :src="noticeForm.thumbnail_url" 
                    alt="썸네일 미리보기" 
                    class="w-12 h-12 object-cover rounded-lg border border-slate-700 bg-slate-900 shrink-0"
                  />
                  <div class="flex-grow min-w-0 text-[11px]">
                    <span class="text-emerald-400 font-bold block mb-0.5 flex items-center gap-1">
                      <i class="fas fa-check-circle text-[10px]"></i> 썸네일 미리보기 연결됨
                    </span>
                    <span class="text-slate-400 truncate block text-[10px]">{{ noticeForm.thumbnail_url }}</span>
                  </div>
                  <button 
                    type="button" 
                    @click="noticeForm.thumbnail_url = ''" 
                    class="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition shrink-0"
                    title="이미지 지우기"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>

              <!-- 상단 중요 공지 고정 -->
              <div class="sm:col-span-3 flex items-end pb-2">
                <label class="flex items-center gap-2 cursor-pointer text-slate-300 font-bold">
                  <input 
                    v-model="noticeForm.is_pinned" 
                    type="checkbox" 
                    class="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span class="text-red-400">🔥 상단 중요 공지로 고정</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-slate-300 font-bold mb-1">목록 요약문 (summary) *</label>
              <input 
                v-model="noticeForm.summary" 
                type="text" 
                required 
                placeholder="목록 카드에 표시될 간단한 요약문을 입력하세요"
                class="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label class="block text-slate-300 font-bold mb-1">상세 본문 내용 (content) *</label>
              <textarea 
                v-model="noticeForm.content" 
                rows="6" 
                required 
                placeholder="공지사항 전체 상세 본문을 작성해 주세요 (줄바꿈 지원)"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:border-blue-500 outline-none"
              ></textarea>
            </div>

            <div class="pt-2 flex justify-end gap-2">
              <button 
                type="button" 
                @click="resetNoticeForm" 
                class="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold"
              >
                초기화
              </button>
              <button 
                type="submit" 
                :disabled="isNoticeSaving"
                class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                <i v-if="isNoticeSaving" class="fas fa-spinner animate-spin"></i>
                <i v-else class="fas fa-save"></i>
                <span>{{ editingNoticeId ? '수정 완료' : '공지사항 등록하기' }}</span>
              </button>
            </div>

          </form>
        </div>

        <!-- Notice List Table -->
        <div class="bg-slate-800/60 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
          <div class="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <i class="fas fa-list"></i>
              <span>등록된 공지사항 목록 ({{ notices.length }}개)</span>
            </h3>
            <button 
              @click="fetchNotices" 
              class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition flex items-center gap-1"
            >
              <i class="fas fa-sync-alt text-xs" :class="{ 'animate-spin': isNoticeLoading }"></i>
              <span>새로고침</span>
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950/60 text-slate-400 font-bold uppercase text-[11px] border-b border-slate-700">
                <tr>
                  <th class="py-3 px-4 w-12 text-center">No</th>
                  <th class="py-3 px-4 min-w-[70px]">썸네일</th>
                  <th class="py-3 px-4 min-w-[100px]">카테고리</th>
                  <th class="py-3 px-4 min-w-[200px]">공지 제목</th>
                  <th class="py-3 px-4 min-w-[90px]">작성일</th>
                  <th class="py-3 px-4 min-w-[70px] text-center">조회수</th>
                  <th class="py-3 px-4 min-w-[120px] text-center">관리</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700/50 bg-slate-900/40">
                <tr v-if="isNoticeLoading">
                  <td colspan="7" class="py-12 text-center text-slate-400">
                    <i class="fas fa-spinner fa-spin text-xl mb-2 block text-blue-400"></i>
                    공지사항을 불러오는 중입니다...
                  </td>
                </tr>
                <tr v-else-if="notices.length === 0">
                  <td colspan="7" class="py-12 text-center text-slate-500">
                    등록된 공지사항이 없습니다. 위 폼에서 새로운 공지를 등록해 보세요.
                  </td>
                </tr>
                <tr v-for="(item, idx) in notices" :key="item.id" class="hover:bg-slate-800/80 transition">
                  <td class="py-3 px-4 text-center font-bold text-slate-500">{{ idx + 1 }}</td>
                  
                  <!-- Thumbnail Mini Preview -->
                  <td class="py-3 px-4">
                    <img 
                      :src="item.thumbnail_url || item.image || defaultNoticeImage" 
                      alt="썸네일" 
                      class="w-10 h-10 object-cover rounded-lg border border-slate-700 bg-slate-950"
                    />
                  </td>

                  <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-700 text-slate-200">
                      {{ item.badge || item.category_name }}
                    </span>
                    <span v-if="item.is_pinned || item.is_important" class="ml-1 text-red-400 font-bold text-[10px]">🔥 중요</span>
                  </td>

                  <td class="py-3 px-4 font-bold text-white">
                    {{ item.title }}
                  </td>

                  <td class="py-3 px-4 text-slate-400 text-[11px]">
                    {{ formatDate(item.created_at) }}
                  </td>

                  <td class="py-3 px-4 text-center text-slate-400">
                    {{ item.views || 0 }}
                  </td>

                  <td class="py-3 px-4 text-center space-x-2">
                    <button 
                      @click="editNotice(item)" 
                      class="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white font-semibold transition"
                    >
                      수정
                    </button>
                    <button 
                      @click="deleteNotice(item.id)" 
                      class="px-2.5 py-1 rounded bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white font-semibold transition"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </section>

      <!-- ========================================================== -->
      <!-- TAB 3: 환율 및 수수료 설정 -->
      <!-- ========================================================== -->
      <section v-if="activeTab === 'settings'" class="space-y-8">
        
        <div class="bg-slate-800/60 rounded-3xl p-6 sm:p-8 border border-slate-700/50 shadow-xl space-y-8">
          
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-700 pb-4">
            <div>
              <h3 class="text-base font-black text-white flex items-center gap-2">
                <i class="fas fa-sliders text-amber-400"></i>
                <span>환율 및 수수료/물류비 기준값 설정</span>
              </h3>
              <p class="text-xs text-slate-400 mt-1">
                여기서 설정한 환율 및 수수료율은 <strong>계산기(/tools/calculator)</strong> 및 <strong>구매대행 신청서</strong>에 실시간으로 즉시 반영됩니다.
              </p>
            </div>

            <span class="text-[11px] text-slate-400">
              마지막 저장: {{ formatDateTime(settingsForm.updated_at) }}
            </span>
          </div>

          <form @submit.prevent="handleSaveSettings" class="space-y-8">
            
            <!-- Section 1: 적용 환율 설정 -->
            <div class="space-y-4">
              <h4 class="text-sm font-bold text-blue-300 flex items-center gap-2">
                <i class="fas fa-coins text-amber-400"></i>
                <span>1. 중국 위안화(CNY/RMB) 적용 환율 설정</span>
              </h4>

              <!-- Mode Selection 2 Cards -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <!-- Mode 1: 수동 고정 환율 -->
                <div 
                  @click="settingsForm.exchange_rate_mode = 'manual'"
                  class="p-5 rounded-2xl border cursor-pointer transition-all duration-200 space-y-3"
                  :class="settingsForm.exchange_rate_mode === 'manual' 
                    ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30' 
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'"
                >
                  <div class="flex items-center justify-between">
                    <label class="flex items-center gap-2.5 cursor-pointer font-bold text-xs" :class="settingsForm.exchange_rate_mode === 'manual' ? 'text-blue-300' : 'text-slate-300'">
                      <input v-model="settingsForm.exchange_rate_mode" type="radio" value="manual" class="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <span>수동 고정 환율 적용 (추천)</span>
                    </label>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="settingsForm.exchange_rate_mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'">
                      {{ settingsForm.exchange_rate_mode === 'manual' ? '적용 중' : '선택' }}
                    </span>
                  </div>

                  <p class="text-[11px] text-slate-400 leading-relaxed">
                    시장 환율 변동과 무관하게 사장님이 지정한 고정 환율(예: <strong>230원</strong>)을 사이트 전역에 일정하게 적용합니다.
                  </p>

                  <div class="pt-2">
                    <label class="block text-[11px] font-bold text-slate-300 mb-1">
                      당사 공식 고정 위안화 환율 (KRW) *
                    </label>
                    <div class="relative w-full sm:w-60">
                      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">¥ 1 =</span>
                      <input 
                        v-model.number="settingsForm.exchange_rate" 
                        type="number" 
                        step="0.1" 
                        min="1"
                        :disabled="settingsForm.exchange_rate_mode !== 'manual'"
                        placeholder="예: 230"
                        class="w-full pl-14 pr-8 py-2 rounded-xl bg-slate-950 border text-amber-400 font-black text-lg outline-none transition disabled:opacity-40 disabled:cursor-not-allowed"
                        :class="settingsForm.exchange_rate_mode === 'manual' ? 'border-amber-500/80 focus:border-amber-400' : 'border-slate-800'"
                      />
                      <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">원</span>
                    </div>
                  </div>
                </div>

                <!-- Mode 2: 실시간 고시 환율 + 마진 자동 연동 -->
                <div 
                  @click="settingsForm.exchange_rate_mode = 'auto_margin'"
                  class="p-5 rounded-2xl border cursor-pointer transition-all duration-200 space-y-3"
                  :class="settingsForm.exchange_rate_mode === 'auto_margin' 
                    ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30' 
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'"
                >
                  <div class="flex items-center justify-between">
                    <label class="flex items-center gap-2.5 cursor-pointer font-bold text-xs" :class="settingsForm.exchange_rate_mode === 'auto_margin' ? 'text-blue-300' : 'text-slate-300'">
                      <input v-model="settingsForm.exchange_rate_mode" type="radio" value="auto_margin" class="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                      <span>실시간 고시 환율 + 환율 마진 자동 연동</span>
                    </label>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="settingsForm.exchange_rate_mode === 'auto_margin' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'">
                      {{ settingsForm.exchange_rate_mode === 'auto_margin' ? '적용 중' : '선택' }}
                    </span>
                  </div>

                  <p class="text-[11px] text-slate-400 leading-relaxed">
                    네이버/하나은행 실시간 고시 환율에 사장님이 설정한 마진(가산금)을 더하여 최종 적용 환율을 자동 산출합니다.
                  </p>

                  <div class="pt-2">
                    <label class="block text-[11px] font-bold text-slate-300 mb-1">
                      설정된 환율 마진 (+원) *
                    </label>
                    <div class="relative w-full sm:w-60">
                      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">+</span>
                      <input 
                        v-model.number="settingsForm.rate_margin" 
                        type="number" 
                        step="0.1" 
                        min="0"
                        :disabled="settingsForm.exchange_rate_mode !== 'auto_margin'"
                        placeholder="예: 5.0"
                        class="w-full pl-10 pr-8 py-2 rounded-xl bg-slate-950 border text-sky-400 font-black text-lg outline-none transition disabled:opacity-40 disabled:cursor-not-allowed"
                        :class="settingsForm.exchange_rate_mode === 'auto_margin' ? 'border-sky-500/80 focus:border-sky-400' : 'border-slate-800'"
                      />
                      <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">원</span>
                    </div>
                  </div>

                  <!-- Real-time Formula Preview -->
                  <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] space-y-1">
                    <span class="text-slate-500 block">실시간 연동 계산 미리보기:</span>
                    <div class="flex items-center gap-1 font-bold text-slate-200">
                      <span class="text-emerald-400">{{ liveRefRate }}원(시장)</span>
                      <span>+</span>
                      <span class="text-sky-400">{{ settingsForm.rate_margin || 0 }}원(마진)</span>
                      <span>=</span>
                      <span class="text-amber-400 font-black text-xs">최종 {{ calculatedAutoRate }}원 적용</span>
                    </div>
                  </div>
                </div>

              </div>

              <!-- Reference Info Banner -->
              <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div class="inline-flex items-center gap-2 text-slate-300">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span class="text-[11px] text-slate-400">현재 네이버/하나은행 실시간 기준 환율:</span>
                  <strong class="text-emerald-400 font-bold">
                    1 CNY = {{ liveRefRate > 0 ? `${liveRefRate} KRW` : '조회 중...' }}
                  </strong>
                </div>
                <span class="text-[11px] text-slate-500">
                  선택된 모드: <strong class="text-amber-400">{{ settingsForm.exchange_rate_mode === 'manual' ? '수동 고정 환율' : '실시간 환율 + 마진' }}</strong>
                </span>
              </div>
            </div>

            <!-- Section 2: 수수료 및 물류비 기준값 -->
            <div class="space-y-4 pt-4 border-t border-slate-700">
              <h4 class="text-sm font-bold text-blue-300 flex items-center gap-2">
                <i class="fas fa-hand-holding-dollar text-emerald-400"></i>
                <span>2. 기본 수수료 및 물류·통관 기준 비용 설정</span>
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                
                <!-- 1. 구매대행 기본 수수료율 -->
                <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <label class="block text-slate-300 font-bold">구매대행 기본 수수료율 (%)</label>
                  <div class="relative">
                    <input 
                      v-model.number="settingsForm.agency_fee_rate" 
                      type="number" 
                      step="0.5" 
                      min="0" 
                      max="100"
                      required
                      class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm outline-none focus:border-blue-500"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                  <span class="text-[10px] text-slate-500 block">기본 추천: 8% (최소 수수료 1만원)</span>
                </div>

                <!-- 2. 해운 LCL 1CBM당 운임 -->
                <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <label class="block text-slate-300 font-bold">해운 LCL 1 CBM당 운임 (원)</label>
                  <div class="relative">
                    <input 
                      v-model.number="settingsForm.sea_cbm_rate" 
                      type="number" 
                      step="1000" 
                      min="0" 
                      required
                      class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm outline-none focus:border-blue-500"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">원</span>
                  </div>
                  <span class="text-[10px] text-slate-500 block">기본 추천: 85,000원 / CBM</span>
                </div>

                <!-- 3. 관세사 통관 수수료 -->
                <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <label class="block text-slate-300 font-bold">관세사 통관 수수료 (원)</label>
                  <div class="relative">
                    <input 
                      v-model.number="settingsForm.customs_clearance_fee" 
                      type="number" 
                      step="1000" 
                      min="0" 
                      required
                      class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm outline-none focus:border-blue-500"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">원</span>
                  </div>
                  <span class="text-[10px] text-slate-500 block">기본 추천: 33,000원 (VAT포함)</span>
                </div>

                <!-- 4. 한-중 FTA C/O 발급대행비 -->
                <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <label class="block text-slate-300 font-bold">한중 FTA C/O 발급비 (원)</label>
                  <div class="relative">
                    <input 
                      v-model.number="settingsForm.fta_co_fee" 
                      type="number" 
                      step="1000" 
                      min="0" 
                      required
                      class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm outline-none focus:border-blue-500"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">원</span>
                  </div>
                  <span class="text-[10px] text-slate-500 block">기본 추천: 33,000원 (건당)</span>
                </div>

              </div>
            </div>

            <!-- Section 3: 메인 히어로 배경 비주얼 관리 (workwave 스타일) -->
            <div class="space-y-4 pt-4 border-t border-slate-700">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-bold text-blue-300 flex items-center gap-2">
                    <i class="fas fa-video text-purple-400"></i>
                    <span>3. 메인 상단 비주얼(Hero) 배경 관리 (workwave.co.kr 스타일)</span>
                  </h4>
                  <p class="text-xs text-slate-400 mt-0.5">
                    메인 최상단에 은은하게 흐르는 고화질 동영상(mp4/유튜브) 또는 배경 이미지와 다크 오버레이 농도를 설정합니다.
                  </p>
                </div>
              </div>

              <!-- Media Type 3 Cards -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label 
                  @click="settingsForm.hero_media_type = 'video_mp4'"
                  class="p-4 rounded-2xl border cursor-pointer transition flex items-center gap-3"
                  :class="settingsForm.hero_media_type === 'video_mp4' 
                    ? 'bg-purple-950/40 border-purple-500 text-purple-200 font-bold ring-2 ring-purple-500/20' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'"
                >
                  <input v-model="settingsForm.hero_media_type" type="radio" value="video_mp4" class="text-purple-600" />
                  <div>
                    <span class="block text-xs font-bold">동영상 파일 (mp4 URL)</span>
                    <span class="text-[10px] text-slate-500">무한 무음 자동재생</span>
                  </div>
                </label>

                <label 
                  @click="settingsForm.hero_media_type = 'youtube'"
                  class="p-4 rounded-2xl border cursor-pointer transition flex items-center gap-3"
                  :class="settingsForm.hero_media_type === 'youtube' 
                    ? 'bg-red-950/40 border-red-500 text-red-200 font-bold ring-2 ring-red-500/20' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'"
                >
                  <input v-model="settingsForm.hero_media_type" type="radio" value="youtube" class="text-red-600" />
                  <div>
                    <span class="block text-xs font-bold">유튜브 영상 링크</span>
                    <span class="text-[10px] text-slate-500">유튜브 ID/URL 자동 파싱</span>
                  </div>
                </label>

                <label 
                  @click="settingsForm.hero_media_type = 'image'"
                  class="p-4 rounded-2xl border cursor-pointer transition flex items-center gap-3"
                  :class="settingsForm.hero_media_type === 'image' 
                    ? 'bg-blue-950/40 border-blue-500 text-blue-200 font-bold ring-2 ring-blue-500/20' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'"
                >
                  <input v-m                  <!-- Quick Presets -->
                  <div class="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-400">
                    <span class="text-slate-500">추천 프리셋:</span>
                    <button 
                      type="button"
                      @click="setHeroPreset('cargo_ship')"
                      class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 transition"
                    >
                      🚢 대형 화물선 항해 mp4
                    </button>
                    <button 
                      type="button"
                      @click="setHeroPreset('warehouse')"
                      class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition"
                    >
                      📦 스마트 물류 창고 mp4
                    </button>
                    <button 
                      type="button"
                      @click="setHeroPreset('port_aerial')"
                      class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
                    >
                      ⚓ 컨테이너 항만 항공뷰 mp4
                    </button>
                    <button 
                      type="button"
                      @click="setHeroPreset('port_image')"
                      class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition"
                    >
                      🖼️ 항만 컨테이너 고화질 사진
                    </button>
                  </div>
                </div>

                <!-- Overlay Darkness Slider -->
                <div class="pt-3 border-t border-slate-800/80 space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <label class="font-bold text-slate-300">
                      다크 오버레이 어두움 강도: <span class="text-purple-400 font-black text-sm">{{ settingsForm.hero_overlay_opacity }}%</span>
                    </label>
                    <span class="text-[11px] text-slate-400">권장: 60% ~ 75% (텍스트 가독성 최적화)</span>
                  </div>
                  <input 
                    v-model.number="settingsForm.hero_overlay_opacity" 
                    type="range" 
                    min="30" 
                    max="90" 
                    step="5"
                    class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <!-- Live Preview Mini Box -->
                <div class="pt-2 space-y-1.5">
                  <span class="text-[11px] font-bold text-slate-400">실시간 배경 렌더링 미리보기:</span>
                  <div class="relative h-40 sm:h-48 w-full rounded-2xl overflow-hidden border border-slate-700 bg-black flex items-center justify-center text-center p-4">
                    
                    <!-- Background Video / Youtube / Image -->
                    <video 
                      v-if="settingsForm.hero_media_type === 'video_mp4'"
                      :src="settingsForm.hero_media_url" 
                      autoplay 
                      loop 
                      muted 
                      playsinline
                      class="absolute inset-0 w-full h-full object-cover"
                    ></video>

                    <iframe 
                      v-else-if="settingsForm.hero_media_type === 'youtube'"
                      :src="getYoutubeEmbedUrl(settingsForm.hero_media_url)"
                      class="absolute inset-0 w-full h-full pointer-events-none scale-125"
                      frameborder="0"
                      allow="autoplay; encrypted-media"
                    ></iframe>

                    <img 
                      v-else
                      :src="settingsForm.hero_media_url" 
                      alt="Hero Preview" 
                      class="absolute inset-0 w-full h-full object-cover"
                    />

                    <!-- Dark Overlay -->
                    <div 
                      class="absolute inset-0 bg-slate-950 transition-opacity duration-300"
                      :style="{ opacity: (settingsForm.hero_overlay_opacity || 65) / 100 }"
                    ></div>

                    <!-- Mock Content -->
                    <div class="relative z-10 space-y-1 text-white">
                      <span class="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold">
                        15 YEARS OF EXCELLENCE
                      </span>
                      <h4 class="text-base sm:text-lg font-black tracking-tight">
                        중국 무역 & 구매대행의 가장 확실한 올인원 파트너
                      </h4>
                      <p class="text-[11px] text-slate-300">
                        (위와 같이 어두운 오버레이 위로 흰색 텍스트가 선명하게 노출됩니다)
                      </p>
                    </div>

                  </div>
                </div>

              </div>
            </div>

            <!-- Save Action Button -->
            <div class="pt-4 border-t border-slate-700 flex justify-end gap-3">
              <button 
                type="button" 
                @click="loadSettings" 
                class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                되돌리기
              </button>

              <button 
                type="submit" 
                :disabled="isSavingSettings"
                class="px-7 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                <i v-if="isSavingSettings" class="fas fa-spinner animate-spin"></i>
                <i v-else class="fas fa-check"></i>
                <span>{{ isSavingSettings ? '저장 중...' : '환율·수수료 및 히어로 비주얼 설정값 저장하기' }}</span>
              </button>
            </div>

          </form>��주얼 설정값 저장하기' }}</span>
              </button>
            </div>

          </form>ems-center gap-2 disabled:opacity-50"
              >
                <i v-if="isSavingSettings" class="fas fa-spinner animate-spin"></i>
                <i v-else class="fas fa-check"></i>
                <span>{{ isSavingSettings ? '저장 중...' : '환율·수수료 및 히어로 비주얼 설정값 저장하기' }}</span>
              </button>
            </div>

                <i v-else class="fas fa-check"></i>
                <span>{{ isSavingSettings ? '저장 중...' : '환율·수수료 및 히어로 비주얼 설정값 저장하기' }}</span>
              </button>
            </div>               </div>

                <!-- 4. 한-중 FTA C/O 발급대행비 -->
                <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                  <label class="block text-slate-300 font-bold">한중 FTA C/O 발급비 (원)</label>
                  <div class="relative">
                    <input 
                      v-model.number="settingsForm.fta_co_fee" 
                      type="number" 
                      step="1000" 
                      min="0"
                      required
                      class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-sm outline-none focus:border-blue-500"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">원</span>
                  </div>
                  <span class="text-[10px] text-slate-500 block">기본 추천: 33,000원 (건당)</span>
                </div>

              </div>
            </div>

            <!-- Save Action Button -->
            <div class="pt-4 border-t border-slate-700 flex justify-end gap-3">
              <button 
                type="button" 
                @click="loadSettings" 
                class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                되돌리기
              </button>

              <button 
                type="submit" 
                :disabled="isSavingSettings"
                class="px-7 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                <i v-if="isSavingSettings" class="fas fa-spinner animate-spin"></i>
                <i v-else class="fas fa-check"></i>
                <span>{{ isSavingSettings ? '저장 중...' : '환율 및 수수료 설정값 저장하기' }}</span>
              </button>
            </div>

          </form>

        </div>

      </section>

    </main>

    <!-- ========================================================== -->
    <!-- Application Detail Modal -->
    <!-- ========================================================== -->
    <div v-if="selectedApp" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" @click.self="selectedApp = null">
      <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl relative text-slate-200 text-xs">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span class="px-2.5 py-1 rounded-md text-[11px] font-bold" :class="getServiceBadgeClass(selectedApp.service_type)">
              {{ selectedApp.service_name }}
            </span>
            <h3 class="text-lg font-black text-white mt-1.5">
              {{ selectedApp.customer_name }} 님의 상세 신청 내역
            </h3>
          </div>
          <button @click="selectedApp = null" class="p-2 text-slate-400 hover:text-white">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <!-- Info Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div>
            <span class="text-slate-500 block mb-0.5">연락처</span>
            <span class="font-bold text-white">{{ selectedApp.phone }}</span>
          </div>
          <div>
            <span class="text-slate-500 block mb-0.5">이메일</span>
            <span class="font-bold text-white">{{ selectedApp.email || '-' }}</span>
          </div>
          <div>
            <span class="text-slate-500 block mb-0.5">예상 견적</span>
            <span class="font-bold text-amber-400">{{ (Number(selectedApp.total_amount) || 0).toLocaleString() }}원</span>
          </div>
          <div>
            <span class="text-slate-500 block mb-0.5">처리 상태</span>
            <span class="font-bold text-sky-400">{{ selectedApp.status }}</span>
          </div>
          <div class="sm:col-span-2">
            <span class="text-slate-500 block mb-0.5">접수 일시</span>
            <span class="font-bold text-slate-300">{{ formatDateTime(selectedApp.created_at) }}</span>
          </div>
        </div>

        <!-- Details (JSON) Breakdown -->
        <div class="space-y-3">
          <h4 class="font-bold text-white text-sm flex items-center gap-1.5">
            <i class="fas fa-list-check text-blue-400"></i>
            <span>고객 입력 세부 옵션 & 품목 데이터</span>
          </h4>

          <!-- Items Table if present -->
          <div v-if="selectedApp.details && selectedApp.details.items && selectedApp.details.items.length > 0" class="border border-slate-800 rounded-xl overflow-hidden">
            <table class="w-full text-left text-[11px]">
              <thead class="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th class="p-2">No</th>
                  <th class="p-2">품목 / URL / SKU</th>
                  <th class="p-2">옵션</th>
                  <th class="p-2 text-right">단가 / 수량</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 bg-slate-900/50">
                <tr v-for="(it, i) in selectedApp.details.items" :key="i">
                  <td class="p-2 text-slate-500">{{ i + 1 }}</td>
                  <td class="p-2">
                    <span v-if="it.name" class="font-bold text-white block">{{ it.name }}</span>
                    <a v-if="it.url" :href="it.url" target="_blank" class="text-blue-400 hover:underline break-all block">
                      {{ it.url }}
                    </a>
                    <span v-if="it.sku" class="text-slate-400 block">{{ it.sku }}</span>
                  </td>
                  <td class="p-2 text-slate-300">{{ it.option || '-' }}</td>
                  <td class="p-2 text-right text-amber-400 font-bold">
                    {{ it.priceCny ? '¥' + it.priceCny + ' / ' : '' }}{{ it.qty }}EA
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Raw JSON Details Viewer -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-[11px] font-mono text-slate-300">
            <pre>{{ JSON.stringify(selectedApp.details, null, 2) }}</pre>
          </div>
        </div>

        <!-- Special Request / Memo -->
        <div v-if="selectedApp.memo" class="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
          <span class="text-slate-400 font-bold block mb-1">고객 요청 사항 (메모)</span>
          <p class="text-slate-200 whitespace-pre-line">{{ selectedApp.memo }}</p>
        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-2">
          <button @click="selectedApp = null" class="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">
            닫기
          </button>
        </div>

      </div>
    </div>

    <!-- ========================================================== -->
    <!-- SQL & Storage Schema Guide Modal -->
    <!-- ========================================================== -->
    <div v-if="showSchemaModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" @click.self="showSchemaModal = false">
      <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl relative text-slate-200 text-xs">
        
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-base font-black text-white flex items-center gap-2">
            <i class="fas fa-database text-blue-400"></i>
            <span>Supabase SQL & Storage 버킷 생성 쿼리</span>
          </h3>
          <button @click="showSchemaModal = false" class="p-2 text-slate-400 hover:text-white">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <p class="text-slate-400 leading-relaxed">
          Supabase 대시보드의 <strong>SQL Editor</strong>에 아래 쿼리를 붙여넣고 <strong>Run</strong> 버튼을 누르시면 공지사항, 고객 접수, 사이트 설정(환율/수수료) 테이블 및 Storage <code>notices</code> 버킷이 한 번에 생성됩니다.
        </p>

        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto relative">
          <button 
            @click="copySql" 
            class="absolute top-3 right-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded shadow transition"
          >
            {{ isCopied ? '복사 완료!' : 'SQL 복사' }}
          </button>
          <pre>{{ SUPABASE_SQL_SCHEMA }}</pre>
        </div>

        <div class="flex justify-end pt-2">
          <button @click="showSchemaModal = false" class="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold">
            확인 닫기
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, isSupabaseConfigured, SUPABASE_SQL_SCHEMA } from '@/lib/supabase'
import { fetchSiteSettings, saveSiteSettings, DEFAULT_SETTINGS } from '@/lib/settings'

const activeTab = ref('applications')
const isDbConnected = computed(() => isSupabaseConfigured())
const showSchemaModal = ref(false)
const isCopied = ref(false)

const defaultNoticeImage = 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/main_bnr_img1.jpg'

// ----------------------------------------------------
// TAB 1: Applications State
// ----------------------------------------------------
const applications = ref([])
const isAppLoading = ref(false)
const appSearchQuery = ref('')
const currentAppFilter = ref('all')
const selectedApp = ref(null)

const appFilters = [
  { id: 'all', name: '전체 보기' },
  { id: 'market_tour', name: '이우 시장투어' },
  { id: 'rocket_growth', name: '쿠팡 로켓그로스' },
  { id: 'purchasing', name: '구매대행' },
  { id: 'trade', name: '무역대행' }
]

const fetchApplications = async () => {
  isAppLoading.value = true
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch Applications Error:', error)
      } else if (data) {
        applications.value = data
      }
    }
  } catch (err) {
    console.error('Applications fetch error:', err)
  } finally {
    isAppLoading.value = false
  }
}

const filteredApplications = computed(() => {
  return applications.value.filter(app => {
    const matchType = currentAppFilter.value === 'all' || app.service_type === currentAppFilter.value
    const matchQuery = !appSearchQuery.value ||
      (app.customer_name && app.customer_name.toLowerCase().includes(appSearchQuery.value.toLowerCase())) ||
      (app.phone && app.phone.includes(appSearchQuery.value))
    return matchType && matchQuery
  })
})

const getStatusCount = (status) => {
  return applications.value.filter(a => a.status === status).length
}

const updateAppStatus = async (app) => {
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('applications')
        .update({ status: app.status })
        .eq('id', app.id)

      if (error) {
        console.error('Update Status Error:', error)
        alert('상태 변경 실패: ' + error.message)
      }
    }
  } catch (err) {
    console.error('Update status exception:', err)
  }
}

const deleteApplication = async (id) => {
  if (!confirm('해당 신청 내역을 삭제하시겠습니까?')) return
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('applications').delete().eq('id', id)
      if (error) {
        console.error('Delete Application Error:', error)
        alert('삭제 실패: ' + error.message)
        return
      }
    }
    applications.value = applications.value.filter(a => a.id !== id)
  } catch (err) {
    console.error('Delete application exception:', err)
  }
}

const openAppDetail = (app) => {
  selectedApp.value = app
}

const getServiceBadgeClass = (type) => {
  switch (type) {
    case 'market_tour': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    case 'rocket_growth': return 'bg-red-500/20 text-red-300 border border-red-500/30'
    case 'purchasing': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    case 'trade': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    default: return 'bg-slate-700 text-slate-300'
  }
}

const getServiceName = (type) => {
  switch (type) {
    case 'market_tour': return '이우 시장투어'
    case 'rocket_growth': return '쿠팡 로켓그로스'
    case 'purchasing': return '구매대행'
    case 'trade': return '무역대행'
    default: return type
  }
}

const getStatusSelectClass = (status) => {
  switch (status) {
    case '접수대기': return 'bg-amber-950/60 text-amber-400 border-amber-600/40'
    case '상담진행': return 'bg-sky-950/60 text-sky-400 border-sky-600/40'
    case '견적완료': return 'bg-purple-950/60 text-purple-400 border-purple-600/40'
    case '처리완료': return 'bg-emerald-950/60 text-emerald-400 border-emerald-600/40'
    default: return 'bg-slate-800 text-slate-300 border-slate-700'
  }
}

// ----------------------------------------------------
// TAB 2: Notices State & Storage Image Upload & CRUD
// ----------------------------------------------------
const notices = ref([])
const isNoticeLoading = ref(false)
const isNoticeSaving = ref(false)
const isUploadingImage = ref(false)
const editingNoticeId = ref(null)
const imageFileInput = ref(null)

const noticeForm = ref({
  title: '',
  category: 'schedule',
  category_name: '업무일정',
  badge: '공지',
  is_pinned: false,
  summary: '',
  content: '',
  thumbnail_url: defaultNoticeImage
})

const onCategoryChange = () => {
  if (noticeForm.value.category === 'schedule') {
    noticeForm.value.category_name = '업무일정'
    noticeForm.value.badge = '공지'
  } else if (noticeForm.value.category === 'logistics') {
    noticeForm.value.category_name = '통관·물류'
    noticeForm.value.badge = '물류'
  } else if (noticeForm.value.category === 'event') {
    noticeForm.value.category_name = '이벤트'
    noticeForm.value.badge = '이벤트'
  }
}

const triggerImageSelect = () => {
  if (imageFileInput.value) {
    imageFileInput.value.click()
  }
}

const handleStorageImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (!isSupabaseConfigured()) {
    alert('Supabase 연동이 되어있지 않습니다. .env 설정을 확인해 주세요.')
    event.target.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    alert('이미지 파일(JPG, PNG, GIF, WEBP 등)만 업로드 가능합니다.')
    event.target.value = ''
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('이미지 파일 크기는 10MB 이하만 가능합니다.')
    event.target.value = ''
    return
  }

  isUploadingImage.value = true

  try {
    const fileExt = file.name.split('.').pop()
    const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `${Date.now()}_${cleanName}.${fileExt}`
    const filePath = `notice_thumbnails/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('notices')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Supabase Storage Upload Error:', uploadError)
      alert(
        `이미지 업로드 실패: ${uploadError.message}\n\n` +
        `[해결 가이드]\n` +
        `Supabase 대시보드의 Storage 메뉴에서 'notices' 버킷이 Public(공개)으로 생성되어 있는지 확인해 주세요.`
      )
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('notices')
      .getPublicUrl(filePath)

    if (publicUrlData && publicUrlData.publicUrl) {
      noticeForm.value.thumbnail_url = publicUrlData.publicUrl
    }
  } catch (err) {
    console.error('Image upload unexpected error:', err)
    alert('이미지 업로드 중 오류가 발생했습니다: ' + (err.message || err))
  } finally {
    isUploadingImage.value = false
    event.target.value = ''
  }
}

const fetchNotices = async () => {
  isNoticeLoading.value = true
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch Notices Error:', error)
      } else if (data) {
        notices.value = data
      }
    }
  } catch (err) {
    console.error('Fetch notices exception:', err)
  } finally {
    isNoticeLoading.value = false
  }
}

const saveNotice = async () => {
  if (!isSupabaseConfigured()) {
    alert('.env 파일에 VITE_SUPABASE_URL 및 VITE_SUPABASE_ANON_KEY를 올바르게 설정해 주세요.')
    return
  }

  isNoticeSaving.value = true

  const payload = {
    title: noticeForm.value.title.trim(),
    category: noticeForm.value.category,
    category_name: noticeForm.value.category_name || '일반',
    badge: noticeForm.value.badge || '공지',
    summary: noticeForm.value.summary.trim(),
    content: noticeForm.value.content.trim(),
    thumbnail_url: noticeForm.value.thumbnail_url || '',
    image: noticeForm.value.thumbnail_url || '',
    is_pinned: Boolean(noticeForm.value.is_pinned),
    is_important: Boolean(noticeForm.value.is_pinned),
    views: 0
  }

  try {
    if (editingNoticeId.value) {
      const { data, error } = await supabase
        .from('notices')
        .update(payload)
        .eq('id', editingNoticeId.value)
        .select()

      if (error) {
        console.error('Supabase Update Error:', error)
        alert('공지사항 수정 실패: ' + error.message)
        return
      }

      alert('공지사항이 성공적으로 수정되었습니다!')
      resetNoticeForm()
      await fetchNotices()

    } else {
      const { data, error } = await supabase
        .from('notices')
        .insert([payload])
        .select()

      if (error) {
        console.error('Supabase Insert Error:', error)
        alert('공지사항 등록 실패: ' + error.message)
        return
      }

      alert('공지사항이 성공적으로 등록되었습니다!')
      resetNoticeForm()
      await fetchNotices()
    }
  } catch (err) {
    console.error('Save notice unexpected error:', err)
    alert('등록 중 예기치 않은 오류가 발생했습니다: ' + (err.message || err))
  } finally {
    isNoticeSaving.value = false
  }
}

const editNotice = (item) => {
  editingNoticeId.value = item.id
  noticeForm.value = {
    title: item.title,
    category: item.category,
    category_name: item.category_name || item.categoryName || '업무일정',
    badge: item.badge || '공지',
    is_pinned: Boolean(item.is_pinned || item.is_important),
    summary: item.summary || '',
    content: item.content || '',
    thumbnail_url: item.thumbnail_url || item.image || ''
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deleteNotice = async (id) => {
  if (!confirm('이 공지사항을 삭제하시겠습니까?')) return
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('notices').delete().eq('id', id)
      if (error) {
        console.error('Supabase Delete Error:', error)
        alert('공지사항 삭제 실패: ' + error.message)
        return
      }
      alert('공지사항이 삭제되었습니다.')
      await fetchNotices()
    }
  } catch (err) {
    console.error('Delete notice exception:', err)
  }
}

const resetNoticeForm = () => {
  editingNoticeId.value = null
  noticeForm.value = {
    title: '',
    category: 'schedule',
    category_name: '업무일정',
    badge: '공지',
    is_pinned: false,
    summary: '',
    content: '',
    thumbnail_url: defaultNoticeImage
  }
}

// ----------------------------------------------------
// TAB 3: Exchange Rate, Fee & Hero Settings State
// ----------------------------------------------------
const settingsForm = ref({ ...DEFAULT_SETTINGS })
const isSavingSettings = ref(false)
const liveRefRate = ref(195.0)

const calculatedAutoRate = computed(() => {
  const base = Number(liveRefRate.value) || 195.0
  const margin = Number(settingsForm.value.rate_margin) || 0
  return Number((base + margin).toFixed(2))
})

const loadSettings = async () => {
  const loaded = await fetchSiteSettings()
  if (loaded) {
    settingsForm.value = { ...loaded }
  }
}

const fetchLiveRefRate = async () => {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY')
    if (res.ok) {
      const data = await res.json()
      if (data && data.rates && data.rates.KRW) {
        liveRefRate.value = Number(data.rates.KRW.toFixed(2))
      }
    }
  } catch (err) {
    console.warn('Live ref rate fetch error:', err)
  }
}

const handleSaveSettings = async () => {
  isSavingSettings.value = true
  try {
    await saveSiteSettings(settingsForm.value)
    alert('설정이 성공적으로 저장되었습니다.')
    await loadSettings()
  } catch (err) {
    console.error('Save settings error:', err)
    alert('설정 저장 실패: ' + (err.message || err))
  } finally {
    isSavingSettings.value = false
  }
}

// ----------------------------------------------------
// TAB 3: Hero Media & Settings Helpers
// ----------------------------------------------------
const heroFileInput = ref(null)
const isUploadingHero = ref(false)

const triggerHeroImageUpload = () => {
  if (heroFileInput.value) {
    heroFileInput.value.click()
  }
}

const handleHeroImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  isUploadingHero.value = true
  try {
    if (!isSupabaseConfigured()) {
      alert('Supabase 설정이 필요합니다.')
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `hero_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const filePath = `hero/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('notices')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Hero Image Upload Error:', uploadError)
      alert('이미지 업로드 실패: ' + uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('notices')
      .getPublicUrl(filePath)

    if (publicUrlData && publicUrlData.publicUrl) {
      settingsForm.value.hero_media_type = 'image'
      settingsForm.value.hero_media_url = publicUrlData.publicUrl
      alert('히어로 배경 이미지가 성공적으로 업로드되었습니다!')
    }
  } catch (err) {
    console.error('Hero Image Upload Exception:', err)
    alert('이미지 업로드 중 오류가 발생했습니다: ' + err.message)
  } finally {
    isUploadingHero.value = false
    if (event.target) event.target.value = ''
  }
}

const setHeroPreset = (type) => {
  if (type === 'cargo_ship') {
    settingsForm.value.hero_media_type = 'video_mp4'
    settingsForm.value.hero_media_url = 'https://assets.mixkit.co/videos/preview/mixkit-cargo-ship-sailing-in-the-ocean-43288-large.mp4'
  } else if (type === 'warehouse') {
    settingsForm.value.hero_media_type = 'video_mp4'
    settingsForm.value.hero_media_url = 'https://assets.mixkit.co/videos/preview/mixkit-forklift-moving-boxes-in-a-warehouse-42588-large.mp4'
  } else if (type === 'port_aerial') {
    settingsForm.value.hero_media_type = 'video_mp4'
    settingsForm.value.hero_media_url = 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-cargo-container-ship-43287-large.mp4'
  } else if (type === 'port_image') {
    settingsForm.value.hero_media_type = 'image'
    settingsForm.value.hero_media_url = 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=2000&q=80'
  }
}

const getYoutubeEmbedUrl = (url) => {
  if (!url) return ''
  let videoId = ''
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1]?.split('&')[0]
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0]
  } else if (url.includes('youtube.com/embed/')) {
    return url
  } else {
    videoId = url
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1`
}

// ----------------------------------------------------
// Helpers & Schema
// ----------------------------------------------------
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const copySql = () => {
  navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

onMounted(() => {
  fetchApplications()
  fetchNotices()
  loadSettings()
  fetchLiveRefRate()
})
</script>
