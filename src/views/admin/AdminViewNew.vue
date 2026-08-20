<template>
  <!-- Loading state during authentication check -->
  <div v-if="isCheckingAuth" class="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
    <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    <div class="text-sm font-semibold tracking-wide text-slate-300">관리자 인증 및 권한 확인 중...</div>
  </div>

  <div v-else-if="isAuthorized" class="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 selection:bg-blue-600 selection:text-white">
    
    <!-- Top Navigation / Header -->
    <header class="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-30 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <router-link 
            to="/admin" 
            @click="activeTab = 'applications'; fetchApplications()" 
            class="flex items-center gap-2 group cursor-pointer"
            title="관리자 메인 대시보드로 이동"
          >
            <span class="text-xl font-black bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent group-hover:opacity-90">
              EUC COMPANY
            </span>
          </router-link>
          <span class="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
            통합 관리자 대시보드
          </span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button 
            @click="activeTab = 'applications'; fetchApplications()" 
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            :class="activeTab === 'applications' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
          >
            <i class="fas fa-inbox"></i>
            <span>신청 관리 ({{ applications.length }})</span>
          </button>

          <button 
            @click="activeTab = 'notices'; fetchNotices()" 
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            :class="activeTab === 'notices' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
          >
            <i class="fas fa-bullhorn"></i>
            <span>공지사항</span>
          </button>

          <button 
            @click="activeTab = 'settings'; loadSettings()" 
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            :class="activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
          >
            <i class="fas fa-sliders"></i>
            <span>환경설정</span>
          </button>

          <button 
            @click="activeTab = 'staff'; fetchStaffList()" 
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            :class="activeTab === 'staff' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
          >
            <i class="fas fa-users-gear"></i>
            <span>직원/권한 관리</span>
          </button>

          <div class="h-5 w-px bg-slate-800 mx-1 hidden sm:block"></div>

          <!-- Quick Link to User Website -->
          <a 
            href="/" 
            target="_blank" 
            title="일반 사용자 메인 웹사이트 새 탭으로 열기"
            class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <i class="fas fa-arrow-up-right-from-square text-[10px] text-blue-400"></i>
            <span class="hidden md:inline">사용자 사이트</span>
          </a>

          <!-- Admin Profile Info & Sign Out -->
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider"
              :class="userRole === 'super_admin' || userRole === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'"
            >
              {{ userRole === 'super_admin' || userRole === 'admin' ? '최고관리자' : '운영스태프' }}
            </span>
            <button 
              @click="handleAdminLogout"
              title="관리자 로그아웃"
              class="px-2.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-bold transition flex items-center gap-1"
            >
              <i class="fas fa-power-off text-[10px]"></i>
              <span class="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      
      <!-- ========================================================== -->
      <!-- TAB 1: CUSTOMER APPLICATIONS LIST -->
      <!-- ========================================================== -->
      <section v-if="activeTab === 'applications'" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <i class="fas fa-file-signature text-blue-400"></i>
              <span>고객 서비스 신청 내역</span>
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              이우 시장투어, 1688 구매대행, OEM/ODM 맞춤 무역, 쿠팡 로켓그로스 의뢰 접수 목록입니다. (총 {{ filteredApplications.length }}건)
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Filter by service -->
            <select 
              v-model="filterService" 
              class="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none focus:border-blue-500 font-medium"
            >
              <option value="all">모든 서비스 전체</option>
              <option value="market_tour">이우 시장투어 신청</option>
              <option value="purchasing">1688 구매대행</option>
              <option value="trade">OEM/ODM 무역대행</option>
              <option value="rocket_growth">쿠팡 로켓그로스 대행</option>
            </select>

            <!-- Excel Export Button -->
            <button 
              type="button"
              @click="exportApplicationsToExcel" 
              class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              title="조회된 신청 목록을 엑셀(CSV) 파일로 다운로드합니다"
            >
              <i class="fas fa-file-excel text-sm text-emerald-200"></i>
              <span>엑셀 다운로드</span>
            </button>

            <!-- Refresh Button -->
            <button 
              type="button"
              @click="fetchApplications" 
              class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <i class="fas fa-sync-alt" :class="{ 'animate-spin': isFetchingApps }"></i>
              <span>새로고침</span>
            </button>
          </div>
        </div>

        <!-- Table Card -->
        <div class="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950 text-slate-400 uppercase font-black text-[11px] border-b border-slate-800">
                <tr>
                  <th class="py-3.5 px-4">신청일시</th>
                  <th class="py-3.5 px-4">서비스 구분</th>
                  <th class="py-3.5 px-4">신청자명</th>
                  <th class="py-3.5 px-4">연락처</th>
                  <th class="py-3.5 px-4 text-right">견적 금액</th>
                  <th class="py-3.5 px-4">주요 요청/품목</th>
                  <th class="py-3.5 px-4 text-center">처리 상태</th>
                  <th class="py-3.5 px-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                <tr 
                  v-for="app in filteredApplications" 
                  :key="app.id" 
                  class="hover:bg-slate-800/40 transition cursor-pointer"
                  @click="openAppDetail(app)"
                >
                  <td class="py-3.5 px-4 text-slate-400 font-mono">
                    {{ formatDateTime(app.created_at) }}
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-md text-[11px] font-bold" :class="getServiceBadgeClass(app.service_type)">
                      {{ app.service_name || getServiceLabel(app.service_type) }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-bold text-white">
                    {{ app.customer_name }}
                    <span v-if="app.company_name" class="text-[10px] text-slate-400 block font-normal">
                      {{ app.company_name }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-mono text-slate-300">
                    {{ app.phone }}
                  </td>
                  <td class="py-3.5 px-4 text-right font-mono font-bold" :class="app.total_amount > 0 ? 'text-amber-400' : 'text-slate-500'">
                    {{ app.total_amount > 0 ? `${Number(app.total_amount).toLocaleString()}원` : '-' }}
                  </td>
                  <td class="py-3.5 px-4 max-w-xs truncate text-slate-300">
                    {{ getAppSummaryText(app) }}
                  </td>
                  <td class="py-3.5 px-4 text-center" @click.stop>
                    <select 
                      v-model="app.status" 
                      @change="updateAppStatus(app.id, app.status)"
                      class="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11px] font-bold outline-none focus:border-blue-500"
                      :class="getStatusClass(app.status)"
                    >
                      <option value="pending">접수 대기</option>
                      <option value="consulting">상담 진행 중</option>
                      <option value="quoted">견적 완료</option>
                      <option value="completed">처리 완료</option>
                      <option value="cancelled">취소/보류</option>
                    </select>
                  </td>
                  <td class="py-3.5 px-4 text-center" @click.stop>
                    <div class="flex items-center justify-center gap-1.5">
                      <button 
                        @click="openAppDetail(app)" 
                        class="px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800/60 text-[11px] font-semibold transition"
                        title="신청 상세 내역 확인"
                      >
                        상세
                      </button>
                      <button 
                        @click="exportSingleApplicationReceipt(app)" 
                        class="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[11px] font-semibold transition flex items-center gap-1"
                        title="해당 건 견적 명세서(CSV/Excel) 다운로드"
                      >
                        <i class="fas fa-file-csv text-[10px]"></i>
                        <span>명세서</span>
                      </button>
                      <button 
                        @click="deleteApplication(app.id)" 
                        class="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-[11px] transition"
                        title="신청 내역 삭제"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr v-if="filteredApplications.length === 0">
                  <td colspan="8" class="py-12 text-center text-slate-500 text-xs">
                    <i class="fas fa-inbox text-3xl mb-2 block opacity-40"></i>
                    접수된 신청 내역이 없습니다.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ========================================================== -->
      <!-- TAB 2: NOTICE & SCHEDULE MANAGEMENT -->
      <!-- ========================================================== -->
      <section v-if="activeTab === 'notices'" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <i class="fas fa-bullhorn text-blue-400"></i>
              <span>공지사항 & 일정 등록 관리</span>
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              메인페이지 공지 피드 및 커뮤니티 공지사항 게시판에 노출되는 글을 작성하고 관리합니다.
            </p>
          </div>

          <button 
            @click="resetNoticeForm" 
            class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <i class="fas fa-plus"></i>
            <span>새 공지사항 작성</span>
          </button>
        </div>

        <!-- Write / Edit Form Card -->
        <div class="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
          <h3 class="text-base font-black text-white flex items-center gap-2">
            <i class="fas fa-pen-to-square text-blue-400"></i>
            <span>{{ editingNoticeId ? '공지사항 수정' : '신규 공지사항 작성' }}</span>
          </h3>

          <form @submit.prevent="handleSaveNotice" class="space-y-4 text-xs">
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <!-- Category -->
              <div>
                <label class="block text-slate-300 font-bold mb-1">분류 카테고리</label>
                <select 
                  v-model="noticeForm.category" 
                  class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold outline-none focus:border-blue-500"
                >
                  <option value="schedule">업무일정 (연휴/마감)</option>
                  <option value="tour">시장투어 모집</option>
                  <option value="customs">세관/통관 안내</option>
                  <option value="shipping">물류/운임 소식</option>
                  <option value="general">일반 공지</option>
                </select>
              </div>

              <!-- Badge text -->
              <div>
                <label class="block text-slate-300 font-bold mb-1">뱃지 라벨</label>
                <input 
                  v-model="noticeForm.badge" 
                  type="text" 
                  placeholder="예: 공지, 필독, 마감, 투어" 
                  class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                />
              </div>

              <!-- Pin to top -->
              <div class="flex items-center pt-6 gap-2">
                <input 
                  v-model="noticeForm.is_pinned" 
                  type="checkbox" 
                  id="is_pinned" 
                  class="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-700 focus:ring-blue-500"
                />
                <label for="is_pinned" class="text-slate-300 font-bold cursor-pointer">
                  최상단 중요 공지 고정 (Pin)
                </label>
              </div>
            </div>

            <!-- Title -->
            <div>
              <label class="block text-slate-300 font-bold mb-1">공지 제목</label>
              <input 
                v-model="noticeForm.title" 
                type="text" 
                required 
                placeholder="제목을 입력하세요" 
                class="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm outline-none focus:border-blue-500"
              />
            </div>

            <!-- Short Summary -->
            <div>
              <label class="block text-slate-300 font-bold mb-1">요약 설명 (메인 피드 노출)</label>
              <input 
                v-model="noticeForm.summary" 
                type="text" 
                placeholder="간단한 1줄 요약문" 
                class="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 outline-none focus:border-blue-500"
              />
            </div>

            <!-- Thumbnail Upload & URL -->
            <div>
              <label class="block text-slate-300 font-bold mb-1">썸네일 이미지</label>
              <div class="flex gap-2">
                <input 
                  v-model="noticeForm.thumbnail_url" 
                  type="url" 
                  placeholder="https://..." 
                  class="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none focus:border-blue-500"
                />
                <button 
                  type="button" 
                  @click="triggerNoticeImageUpload" 
                  :disabled="isUploadingNoticeImg"
                  class="px-4 py-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white font-bold text-xs border border-blue-500/40 transition flex items-center gap-1.5 shrink-0"
                >
                  <i v-if="isUploadingNoticeImg" class="fas fa-spinner animate-spin"></i>
                  <i v-else class="fas fa-cloud-arrow-up"></i>
                  <span>{{ isUploadingNoticeImg ? '업로드 중...' : '이미지 업로드' }}</span>
                </button>
                <input 
                  ref="noticeFileInput" 
                  type="file" 
                  accept="image/*" 
                  class="hidden" 
                  @change="handleNoticeImageUpload" 
                />
              </div>
            </div>

            <!-- Content -->
            <div>
              <label class="block text-slate-300 font-bold mb-1">상세 내용 (줄바꿈 지원)</label>
              <textarea 
                v-model="noticeForm.content" 
                rows="6" 
                required 
                placeholder="상세 공지 내용을 입력하세요" 
                class="w-full p-4 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 outline-none focus:border-blue-500 leading-relaxed font-sans"
              ></textarea>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button 
                v-if="editingNoticeId" 
                type="button" 
                @click="resetNoticeForm" 
                class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
              >
                작성 취소
              </button>

              <button 
                type="submit" 
                :disabled="isSavingNotice"
                class="px-7 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
              >
                <i v-if="isSavingNotice" class="fas fa-spinner animate-spin"></i>
                <i v-else class="fas fa-check"></i>
                <span>{{ editingNoticeId ? '공지 수정 완료' : '공지 등록하기' }}</span>
              </button>
            </div>

          </form>
        </div>

        <!-- Notices List Table -->
        <div class="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950 text-slate-400 uppercase font-black text-[11px] border-b border-slate-800">
                <tr>
                  <th class="py-3.5 px-4 text-center">고정</th>
                  <th class="py-3.5 px-4">분류/뱃지</th>
                  <th class="py-3.5 px-4">제목</th>
                  <th class="py-3.5 px-4">등록일</th>
                  <th class="py-3.5 px-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                <tr v-for="item in notices" :key="item.id" class="hover:bg-slate-800/40 transition">
                  <td class="py-3.5 px-4 text-center">
                    <i v-if="item.is_pinned" class="fas fa-thumbtack text-amber-400"></i>
                    <span v-else class="text-slate-600">-</span>
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/20 text-[11px] font-bold">
                      {{ item.badge || item.category_name || '공지' }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-bold text-white max-w-md truncate">
                    {{ item.title }}
                  </td>
                  <td class="py-3.5 px-4 font-mono text-slate-400">
                    {{ formatDate(item.created_at) }}
                  </td>
                  <td class="py-3.5 px-4 text-center space-x-2">
                    <button 
                      @click="editNotice(item)" 
                      class="px-2.5 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900 text-blue-300 border border-blue-800/60 transition"
                    >
                      수정
                    </button>
                    <button 
                      @click="deleteNotice(item.id)" 
                      class="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 transition"
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
      <!-- TAB 3: EXCHANGE RATE, FEE & HERO VIDEO SETTINGS -->
      <!-- ========================================================== -->
      <section v-if="activeTab === 'settings'" class="space-y-6">
        <div>
          <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <i class="fas fa-sliders text-blue-400"></i>
            <span>환율, 수수료 및 메인 히어로 배경 관리</span>
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            사이트 전역에 적용되는 위안화 환율 공식, 기본 구매대행 수수료, CBM 해운 운임 및 메인 상단 동영상 배경을 실시간으로 관리합니다.
          </p>
        </div>

        <div class="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-8">
          
          <form @submit.prevent="handleSaveSettings" class="space-y-8">
            
            <!-- Section 1: 환율 적용 방식 -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold text-blue-300 flex items-center gap-2">
                  <i class="fas fa-coins text-amber-400"></i>
                  <span>1. 위안화(CNY/RMB) 환율 적용 방식 설정</span>
                </h4>
                <span class="text-[11px] text-slate-400">
                  현재 네이버/하나은행 실시간 기준가: <strong class="text-amber-300">{{ liveRefRate }}원</strong>
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <!-- Option A: Manual Fixed Rate -->
                <label 
                  @click="settingsForm.exchange_rate_mode = 'manual'"
                  class="p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3"
                  :class="settingsForm.exchange_rate_mode === 'manual' 
                    ? 'bg-blue-950/40 border-blue-500 text-blue-200 font-bold ring-2 ring-blue-500/20' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <input v-model="settingsForm.exchange_rate_mode" type="radio" value="manual" class="text-blue-600" />
                      <span class="text-sm font-black">수동 고정 환율 모드</span>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">대표님 지정값</span>
                  </div>
                  
                  <div class="space-y-1.5 pt-2">
                    <label class="block text-[11px] text-slate-300">당사 공식 적용 위안화 환율 (KRW)</label>
                    <div class="relative">
                      <input 
                        v-model.number="settingsForm.exchange_rate" 
                        type="number" 
                        step="0.01" 
                        required
                        class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-base outline-none focus:border-blue-500"
                      />
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">원</span>
                    </div>
                  </div>
                </label>

                <!-- Option B: Auto Real-Time + Margin -->
                <label 
                  @click="settingsForm.exchange_rate_mode = 'auto_margin'"
                  class="p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3"
                  :class="settingsForm.exchange_rate_mode === 'auto_margin' 
                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200 font-bold ring-2 ring-indigo-500/20' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900'"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <input v-model="settingsForm.exchange_rate_mode" type="radio" value="auto_margin" class="text-indigo-600" />
                      <span class="text-sm font-black">실시간 고시 환율 + 마진 자동 연동</span>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-bold">자동 갱신</span>
                  </div>

                  <div class="space-y-1.5 pt-2">
                    <label class="block text-[11px] text-slate-300">설정 환율 마진 (+원)</label>
                    <div class="relative">
                      <input 
                        v-model.number="settingsForm.rate_margin" 
                        type="number" 
                        step="0.1" 
                        required
                        class="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-black text-base outline-none focus:border-indigo-500"
                      />
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">+ 원</span>
                    </div>
                  </div>

                  <div class="text-[11px] text-indigo-300 pt-1">
                    현재 자동 연산 적용 환율: <strong>{{ calculatedAutoRate }}원</strong> ({{ liveRefRate }}원 + {{ settingsForm.rate_margin }}원)
                  </div>
                </label>

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
                  <input v-model="settingsForm.hero_media_type" type="radio" value="image" class="text-blue-600" />
                  <div>
                    <span class="block text-xs font-bold">고화질 배경 이미지</span>
                    <span class="text-[10px] text-slate-500">Storage 업로드 / 사진 URL</span>
                  </div>
                </label>
              </div>

              <!-- Media URL & Upload Inputs -->
              <div class="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <label class="block text-slate-300 font-bold text-xs mb-1.5">
                    {{ settingsForm.hero_media_type === 'youtube' ? '유튜브 링크 (URL 또는 ID)' : '배경 미디어 URL' }}
                  </label>
                  <div class="flex gap-2">
                    <input 
                      v-model="settingsForm.hero_media_url" 
                      type="text" 
                      required
                      placeholder="https://..." 
                      class="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs outline-none focus:border-purple-500"
                    />
                    
                    <button 
                      type="button" 
                      @click="triggerHeroFileUpload" 
                      :disabled="isUploadingHero"
                      class="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white font-bold text-xs border border-purple-500/40 transition flex items-center gap-1.5 shrink-0 active:scale-95"
                    >
                      <i v-if="isUploadingHero" class="fas fa-spinner animate-spin"></i>
                      <i v-else class="fas fa-cloud-arrow-up"></i>
                      <span>{{ isUploadingHero ? '업로드 중...' : (settingsForm.hero_media_type === 'video_mp4' ? '동영상 업로드' : (settingsForm.hero_media_type === 'image' ? '사진 업로드' : '파일 업로드')) }}</span>
                    </button>
                    <input 
                      ref="heroFileInput" 
                      type="file" 
                      accept="video/mp4, video/*, image/*" 
                      class="hidden" 
                      @change="handleHeroFileUpload" 
                    />
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

          </form>

        </div>

      </section>

      <!-- ========================================================== -->
      <!-- TAB 4: STAFF & ROLE MANAGEMENT -->
      <!-- ========================================================== -->
      <section v-if="activeTab === 'staff'" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <i class="fas fa-users-gear text-indigo-400"></i>
              <span>운영 직원 및 관리자 권한 관리</span>
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              관리자 콘솔(/admin)에 접근할 수 있는 직원 계정을 등록하고 최고관리자(Super Admin) 또는 운영스태프(Staff) 권한을 부여합니다.
            </p>
          </div>

          <button 
            @click="showAddStaffModal = true" 
            class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 shrink-0"
          >
            <i class="fas fa-user-plus"></i>
            <span>새 직원 계정 등록</span>
          </button>
        </div>

        <!-- Security Role Guide Card -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div class="flex items-center gap-2 font-bold text-amber-300 text-xs">
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>최고관리자 (Super Admin)</span>
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              고객 주문/신청서 관리, 환율/수수료 설정, 공지사항 등록 및 <strong>직원 계정 생성/권한 변경</strong> 전체 권한 보유
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div class="flex items-center gap-2 font-bold text-blue-300 text-xs">
              <span class="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>운영스태프 (Staff)</span>
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              고객 주문 접수/처리 상태 변경, 견적 확인, 공지사항 등록 및 일상적인 운영 업무 수행
            </p>
          </div>
        </div>

        <!-- Staff List Table -->
        <div class="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-950 text-slate-400 uppercase font-black text-[11px] border-b border-slate-800">
                <tr>
                  <th class="py-3.5 px-4">직원명 / 담당자</th>
                  <th class="py-3.5 px-4">이메일 계정</th>
                  <th class="py-3.5 px-4">부여된 권한</th>
                  <th class="py-3.5 px-4">등록 일시</th>
                  <th class="py-3.5 px-4 text-center">권한 변경</th>
                  <th class="py-3.5 px-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                <tr v-for="staff in staffList" :key="staff.id || staff.email" class="hover:bg-slate-800/40 transition">
                  <td class="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs">
                      {{ (staff.name || staff.email || 'S').charAt(0).toUpperCase() }}
                    </div>
                    <span>{{ staff.name || '직원' }}</span>
                  </td>
                  <td class="py-3.5 px-4 font-mono text-slate-300">
                    {{ staff.email }}
                  </td>
                  <td class="py-3.5 px-4">
                    <span 
                      class="px-2.5 py-1 rounded-md text-[11px] font-bold"
                      :class="staff.role === 'super_admin' || staff.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'"
                    >
                      {{ staff.role === 'super_admin' || staff.role === 'admin' ? '최고관리자' : '운영스태프' }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-mono text-slate-400">
                    {{ formatDateTime(staff.created_at) }}
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <select 
                      v-model="staff.role"
                      @change="updateStaffRole(staff)"
                      class="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="staff">운영스태프 (Staff)</option>
                      <option value="super_admin">최고관리자 (Super Admin)</option>
                    </select>
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <button 
                      @click="deleteStaff(staff)"
                      class="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-[11px] transition"
                    >
                      해제
                    </button>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr v-if="staffList.length === 0">
                  <td colspan="6" class="py-12 text-center text-slate-500 text-xs">
                    <i class="fas fa-user-shield text-3xl mb-2 block opacity-40"></i>
                    등록된 직원 계정이 없습니다. [+ 새 직원 계정 등록]을 눌러 추가하세요.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </main>

    <!-- Modal: Add New Staff -->
    <div v-if="showAddStaffModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" @click.self="showAddStaffModal = false">
      <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative text-slate-200 text-xs">
        
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-sm border border-indigo-500/40">
              <i class="fas fa-user-plus"></i>
            </div>
            <h3 class="text-base font-black text-white">신규 직원 계정 등록</h3>
          </div>
          <button @click="showAddStaffModal = false" class="p-1 text-slate-400 hover:text-white">
            <i class="fas fa-times text-base"></i>
          </button>
        </div>

        <form @submit.prevent="handleCreateStaff" class="space-y-4">
          <div>
            <label class="block text-slate-300 font-bold mb-1">직원 이름 <span class="text-red-400">*</span></label>
            <input 
              v-model="newStaffForm.name" 
              type="text" 
              required 
              placeholder="예: 김상담 매니저"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label class="block text-slate-300 font-bold mb-1">직원 이메일 (로그인 ID) <span class="text-red-400">*</span></label>
            <input 
              v-model="newStaffForm.email" 
              type="email" 
              required 
              placeholder="staff@euccompany.com"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label class="block text-slate-300 font-bold mb-1">초기 임시 비밀번호 <span class="text-red-400">*</span></label>
            <input 
              v-model="newStaffForm.password" 
              type="text" 
              required 
              minlength="6"
              placeholder="6자리 이상 비밀번호 입력"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label class="block text-slate-300 font-bold mb-1">부여할 권한 역할 <span class="text-red-400">*</span></label>
            <select 
              v-model="newStaffForm.role" 
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-xs outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="staff">운영스태프 (Staff) - 주문/신청 및 공지 관리</option>
              <option value="super_admin">최고관리자 (Super Admin) - 전권 보유</option>
            </select>
          </div>

          <div class="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button 
              type="button" 
              @click="showAddStaffModal = false"
              class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
            >
              취소
            </button>
            <button 
              type="submit" 
              :disabled="isCreatingStaff"
              class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <i v-if="isCreatingStaff" class="fas fa-spinner animate-spin"></i>
              <i v-else class="fas fa-check"></i>
              <span>{{ isCreatingStaff ? '등록 처리 중...' : '직원 등록 완료' }}</span>
            </button>
          </div>
        </form>

      </div>
    </div>

    <!-- ========================================================== -->
    <!-- Application Detail Modal -->
    <!-- ========================================================== -->
    <div v-if="selectedApp" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" @click.self="selectedApp = null">
      <div class="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative text-slate-200 text-xs">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span class="px-2.5 py-1 rounded-md text-[11px] font-bold" :class="getServiceBadgeClass(selectedApp.service_type)">
              {{ selectedApp.service_name || getServiceLabel(selectedApp.service_type) }}
            </span>
            <h3 class="text-lg font-black text-white mt-1.5 flex items-center gap-2">
              <span>{{ selectedApp.customer_name }} 님의 상세 신청 내역</span>
            </h3>
          </div>
          <button @click="selectedApp = null" class="p-2 text-slate-400 hover:text-white rounded-lg transition">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div class="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <span class="text-slate-500 block text-[11px]">연락처 (전화번호)</span>
            <a :href="`tel:${selectedApp.phone}`" class="font-bold text-white font-mono text-sm hover:text-blue-400 transition flex items-center gap-1.5">
              <i class="fas fa-phone-alt text-xs text-blue-400"></i>
              <span>{{ selectedApp.phone }}</span>
            </a>
          </div>

          <div class="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <span class="text-slate-500 block text-[11px]">이메일</span>
            <span class="font-bold text-white font-mono text-sm">{{ selectedApp.email || '-' }}</span>
          </div>

          <div class="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <span class="text-slate-500 block text-[11px]">총 견적 / 예상 금액</span>
            <span class="font-bold text-amber-400 font-mono text-sm">
              {{ selectedApp.total_amount > 0 ? `${Number(selectedApp.total_amount).toLocaleString()}원` : '별도 협의 / 실비 청구' }}
            </span>
          </div>

          <div class="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
            <span class="text-slate-500 block text-[11px]">접수 일시</span>
            <span class="font-bold text-slate-300 font-mono text-xs">{{ formatDateTime(selectedApp.created_at) }}</span>
          </div>
        </div>

        <!-- 1. Market Tour Details Box -->
        <div v-if="selectedApp.service_type === 'market_tour'" class="space-y-2.5">
          <label class="block font-bold text-amber-300 flex items-center gap-1.5 text-xs">
            <i class="fas fa-plane-departure text-amber-400"></i>
            <span>이우 시장투어 상세 신청 명세</span>
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div class="p-3.5 bg-slate-950 rounded-2xl border border-blue-500/30 space-y-1">
              <span class="text-blue-400 font-bold block text-[11px] flex items-center gap-1">
                <i class="fas fa-car"></i> 공항 픽업 / 샌딩 코스
              </span>
              <p class="font-bold text-white text-xs">
                {{ selectedApp.details?.pickupAirport || selectedApp.details?.pickupSummaryText || (selectedApp.details?.usePickup ? '신청' : '미신청') }}
              </p>
              <p class="text-[11px] text-slate-400">
                차량: {{ selectedApp.details?.vehicleType || '5인승 비즈니스 세단' }}
              </p>
            </div>

            <div class="p-3.5 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-1">
              <span class="text-amber-400 font-bold block text-[11px] flex items-center gap-1">
                <i class="fas fa-user-tie"></i> 1:1 무역 전담 통역 가이드
              </span>
              <p class="font-bold text-white text-xs">
                {{ selectedApp.details?.guideSummaryText || (selectedApp.details?.guideDays ? `${selectedApp.details.guideDays}일` : '미신청') }}
              </p>
              <p class="text-[11px] text-slate-400">
                분야: {{ selectedApp.details?.guideCategory || '생활잡화/판촉물' }}
              </p>
            </div>

            <div class="p-3.5 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-1">
              <span class="text-emerald-400 font-bold block text-[11px] flex items-center gap-1">
                <i class="fas fa-calendar-days"></i> 입국 / 출국 투어 일정
              </span>
              <p class="font-bold text-white text-xs">
                입국: {{ selectedApp.details?.arrivalDate || '미정' }}<br/>
                출국: {{ selectedApp.details?.returnDate || '미정' }}
              </p>
            </div>

            <div class="p-3.5 bg-slate-950 rounded-2xl border border-purple-500/30 space-y-1">
              <span class="text-purple-400 font-bold block text-[11px] flex items-center gap-1">
                <i class="fas fa-tags"></i> 조사 희망 품목 & 무료 지원
              </span>
              <p class="font-bold text-white text-xs">
                {{ selectedApp.details?.targetItem || selectedApp.memo || '미지정' }}
              </p>
              <div class="flex items-center gap-2 text-[10px] pt-0.5">
                <span v-if="selectedApp.details?.supportHotel" class="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 font-bold">호텔예약지원</span>
                <span v-if="selectedApp.details?.support1688" class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30 font-bold">1688사전비교</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Trade Agent Details Box -->
        <div v-if="selectedApp.service_type === 'trade' || selectedApp.service_type === 'trade_agent'" class="space-y-2">
          <label class="block font-bold text-emerald-300 flex items-center gap-1.5">
            <i class="fas fa-handshake text-emerald-400"></i>
            <span>OEM/ODM 무역대행 의뢰 상세</span>
          </label>
          <div class="p-4 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-2 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div><strong class="text-slate-400">품목 카테고리:</strong> {{ selectedApp.details?.category || '-' }}</div>
              <div><strong class="text-slate-400">목표 수량(MOQ):</strong> {{ selectedApp.details?.moq || '-' }}</div>
              <div><strong class="text-slate-400">목표 단가:</strong> {{ selectedApp.details?.targetPrice || '-' }}</div>
              <div><strong class="text-slate-400">공장 실사 동행:</strong> {{ selectedApp.details?.needInspectionTrip ? '신청함' : '미신청' }}</div>
            </div>
            <div v-if="selectedApp.details?.refUrl" class="pt-1.5 border-t border-slate-800">
              <strong class="text-slate-400 block mb-0.5">참고 URL:</strong>
              <a :href="selectedApp.details.refUrl" target="_blank" class="text-blue-400 hover:underline break-all">
                {{ selectedApp.details.refUrl }}
              </a>
            </div>
          </div>
        </div>

        <!-- 3. Rocket Growth Details Box -->
        <div v-if="selectedApp.service_type === 'rocket_growth'" class="space-y-2">
          <label class="block font-bold text-rose-300 flex items-center gap-1.5">
            <i class="fas fa-rocket text-rose-400"></i>
            <span>쿠팡 로켓그로스 입고 대행 상세</span>
          </label>
          <div class="p-4 bg-slate-950 rounded-2xl border border-rose-500/30 space-y-2 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div><strong class="text-slate-400">쿠팡 센터(FC):</strong> {{ selectedApp.details?.targetFc || selectedApp.details?.coupangFC || '-' }}</div>
              <div><strong class="text-slate-400">입고 희망일:</strong> {{ selectedApp.details?.targetDate || '-' }}</div>
              <div><strong class="text-slate-400">총 품목 수량:</strong> {{ selectedApp.details?.totalQuantity ? `${selectedApp.details.totalQuantity.toLocaleString()} EA` : '-' }}</div>
              <div><strong class="text-slate-400">총 박스 수:</strong> {{ selectedApp.details?.grandTotalBoxes ? `${selectedApp.details.grandTotalBoxes} 박스` : '-' }}</div>
            </div>
            <div v-if="selectedApp.details?.services" class="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
              <span v-if="selectedApp.details.services.barcode" class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[11px] font-bold">바코드 부착</span>
              <span v-if="selectedApp.details.services.pallet" class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px] font-bold">파레트 적재&랩핑</span>
              <span v-if="selectedApp.details.services.repack" class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[11px] font-bold">에어캡 완충포장</span>
              <span v-if="selectedApp.details.services.inspection" class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">정밀 전수검품</span>
            </div>
          </div>
        </div>

        <!-- 4. Additional Warehouse Services Box (Purchasing & General) -->
        <div v-if="selectedApp.additional_services || selectedApp.details?.additionalServices" class="space-y-2">
          <label class="block font-bold text-amber-400 flex items-center gap-1.5">
            <i class="fas fa-shield-halved"></i>
            <span>신청된 현지 창고 부가서비스</span>
          </label>
          <div class="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-2">
            <div class="flex flex-wrap gap-2">
              <span v-if="(selectedApp.additional_services?.precision_inspection || selectedApp.details?.additionalServices?.precision_inspection)" class="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold">
                ✓ 기본 정밀검수
              </span>
              <span v-if="(selectedApp.additional_services?.origin_labeling || selectedApp.details?.additionalServices?.origin_labeling)" class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
                ✓ 원산지 표기 (MADE IN CHINA)
              </span>
              <span v-if="(selectedApp.additional_services?.packaging_reinforcement || selectedApp.details?.additionalServices?.packaging_reinforcement)" class="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-bold">
                ✓ 포장 보강 / 재포장
              </span>
              <span v-if="(selectedApp.additional_services?.photo_inspection || selectedApp.details?.additionalServices?.photo_inspection)" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                ✓ 검품 사진 촬영
              </span>
              <span v-if="(selectedApp.additional_services?.barcode_attachment || selectedApp.details?.additionalServices?.barcode_attachment)" class="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-400/30 text-xs font-bold">
                ✓ 개별 바코드 부착
              </span>
            </div>
            <p v-if="selectedApp.additional_services?.custom_request || selectedApp.details?.additionalServices?.custom_request" class="text-xs text-slate-300 pt-1 border-t border-slate-800">
              <strong class="text-slate-400">기타 부가 요청:</strong> {{ selectedApp.additional_services?.custom_request || selectedApp.details?.additionalServices?.custom_request }}
            </p>
          </div>
        </div>

        <!-- 5. Purchasing Items Table (If purchasing service) -->
        <div v-if="selectedApp.details?.items && selectedApp.details.items.length" class="space-y-2">
          <label class="block font-bold text-sky-400 flex items-center gap-1.5">
            <i class="fas fa-list-check"></i>
            <span>구매대행 신청 품목 리스트 ({{ selectedApp.details.items.length }}건)</span>
          </label>
          <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-900 text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th class="py-2.5 px-3">상품 URL / 명칭</th>
                  <th class="py-2.5 px-3">옵션</th>
                  <th class="py-2.5 px-3 text-right">단가(¥)</th>
                  <th class="py-2.5 px-3 text-right">수량</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                <tr v-for="(it, idx) in selectedApp.details.items" :key="idx">
                  <td class="py-2 px-3 max-w-[200px] truncate">
                    <a v-if="it.url" :href="it.url" target="_blank" class="text-blue-400 hover:underline flex items-center gap-1">
                      <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>
                      <span class="truncate">{{ it.url }}</span>
                    </a>
                    <span v-else>{{ it.name || it.sku || '상품명 미기재' }}</span>
                  </td>
                  <td class="py-2 px-3">{{ it.option || '-' }}</td>
                  <td class="py-2 px-3 text-right font-mono">{{ it.priceCny ? `¥ ${it.priceCny}` : '-' }}</td>
                  <td class="py-2 px-3 text-right font-mono font-bold">{{ it.qty ? `${it.qty} EA` : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Requirement / Memo / Structured Message -->
        <div class="space-y-2">
          <label class="block font-bold text-slate-400 flex items-center gap-1.5">
            <i class="fas fa-comment-dots text-slate-400"></i>
            <span>상세 메모 및 신청서 전문</span>
          </label>
          <div class="p-4 bg-slate-950 rounded-2xl border border-slate-800 whitespace-pre-line leading-relaxed text-slate-200 font-mono text-xs max-h-60 overflow-y-auto">
            {{ selectedApp.details?.fullApplicationMessage || selectedApp.memo || selectedApp.requirement || selectedApp.item_name || '작성된 상세 요청사항이 없습니다.' }}
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-slate-400 font-bold text-xs">처리 상태:</span>
            <select 
              v-model="selectedApp.status" 
              @change="updateAppStatus(selectedApp.id, selectedApp.status)"
              class="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold outline-none"
              :class="getStatusClass(selectedApp.status)"
            >
              <option value="pending">접수 대기</option>
              <option value="consulting">상담 진행 중</option>
              <option value="quoted">견적 완료</option>
              <option value="completed">처리 완료</option>
              <option value="cancelled">취소/보류</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <button 
              @click="deleteApplication(selectedApp.id)" 
              class="px-4 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 font-bold rounded-xl text-xs transition"
            >
              삭제
            </button>
            <button 
              @click="selectedApp = null" 
              class="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
            >
              닫기
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { fetchSiteSettings, saveSiteSettings, DEFAULT_SETTINGS } from '../../lib/settings'
import { currentUser, userRole, checkUserRole, isSuperAdmin, signOut } from '../../lib/auth'

const router = useRouter()

// Auth Guard States
const isCheckingAuth = ref(true)
const isAuthorized = ref(false)

const verifyAdminAccess = async () => {
  isCheckingAuth.value = true
  try {
    let user = currentUser.value
    if (!user && isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession()
      user = session?.user || null
      if (user) currentUser.value = user
    }

    if (!user) {
      router.replace('/login')
      return false
    }

    const role = await checkUserRole(user)
    if (!['super_admin', 'staff', 'admin'].includes(role)) {
      alert('관리자 권한(Admin/Staff)이 필요한 페이지입니다.')
      router.replace('/login')
      return false
    }

    isAuthorized.value = true
    return true
  } catch (err) {
    console.error('Admin component auth verification error:', err)
    router.replace('/login')
    return false
  } finally {
    isCheckingAuth.value = false
  }
}

// Active Tab ('applications' | 'notices' | 'settings' | 'staff')
const activeTab = ref('applications')

const handleAdminLogout = async () => {
  if (confirm('관리자 콘솔에서 로그아웃하시겠습니까?')) {
    await signOut()
    router.replace('/login')
  }
}

// ----------------------------------------------------
// TAB 1: Applications State & Logic
// ----------------------------------------------------
const applications = ref([])
const isFetchingApps = ref(false)
const filterService = ref('all')
const selectedApp = ref(null)

const filteredApplications = computed(() => {
  if (filterService.value === 'all') return applications.value
  return applications.value.filter(app => {
    if (filterService.value === 'trade') {
      return app.service_type === 'trade' || app.service_type === 'trade_agent'
    }
    if (filterService.value === 'purchasing') {
      return app.service_type === 'purchasing' || app.service_type === 'purchasing_agent'
    }
    return app.service_type === filterService.value
  })
})

const getAppSummaryText = (app) => {
  if (app.details?.targetItem) return `품목: ${app.details.targetItem}`
  if (app.details?.category) return `카테고리: ${app.details.category}`
  if (app.details?.items && app.details.items.length) return `신청품목 ${app.details.items.length}종`
  if (app.details?.targetFc) return `쿠팡 ${app.details.targetFc} 입고`
  return app.memo || app.requirement || app.item_name || '-'
}

const fetchApplications = async () => {
  isFetchingApps.value = true
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch applications error:', error)
      } else if (data) {
        applications.value = data
      }
    }
  } catch (err) {
    console.error('Exception fetching applications:', err)
  } finally {
    isFetchingApps.value = false
  }
}

const updateAppStatus = async (id, status) => {
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        console.error('Status update error:', error)
        alert('상태 업데이트 실패: ' + error.message)
      }
    }
  } catch (err) {
    console.error('Status update exception:', err)
  }
}

const deleteApplication = async (id) => {
  if (!confirm('이 신청 내역을 삭제하시겠습니까?')) return
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('applications').delete().eq('id', id)
      if (error) {
        alert('삭제 실패: ' + error.message)
        return
      }
      applications.value = applications.value.filter(a => a.id !== id)
      if (selectedApp.value?.id === id) selectedApp.value = null
    }
  } catch (err) {
    console.error('Delete application exception:', err)
  }
}

const openAppDetail = async (app) => {
  selectedApp.value = app
  // When opening a new application in 'pending' / '접수대기' state, automatically update status to 'consulting'
  if (app && (app.status === 'pending' || app.status === '접수대기')) {
    app.status = 'consulting'
    await updateAppStatus(app.id, 'consulting')
  }
}

const getServiceLabel = (type) => {
  switch (type) {
    case 'market_tour': return '이우 시장투어'
    case 'rocket_growth': return '쿠팡 로켓그로스'
    case 'purchasing':
    case 'purchasing_agent': return '1688 구매대행'
    case 'trade':
    case 'trade_agent': return 'OEM/ODM 무역'
    default: return '서비스 신청'
  }
}

const getServiceBadgeClass = (type) => {
  switch (type) {
    case 'market_tour': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    case 'rocket_growth': return 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
    case 'purchasing':
    case 'purchasing_agent': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    case 'trade':
    case 'trade_agent': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    default: return 'bg-slate-800 text-slate-300'
  }
}

const getStatusClass = (status) => {
  switch (status) {
    case 'pending':
    case '접수대기': return 'text-amber-400 border-amber-500/40'
    case 'consulting':
    case '상담진행': return 'text-blue-400 border-blue-500/40'
    case 'quoted':
    case '견적완료': return 'text-purple-400 border-purple-500/40'
    case 'completed':
    case '처리완료': return 'text-emerald-400 border-emerald-500/40'
    case 'cancelled':
    case '취소/보류': return 'text-slate-500 border-slate-700'
    default: return 'text-slate-300'
  }
}

const statusNameMap = {
  pending: '접수 대기',
  consulting: '상담 진행 중',
  quoted: '견적 완료',
  completed: '처리 완료',
  cancelled: '취소/보류',
  '접수대기': '접수 대기',
  '상담진행': '상담 진행 중',
  '견적완료': '견적 완료',
  '처리완료': '처리 완료'
}

// Single Application Receipt Export
const exportSingleApplicationReceipt = (app) => {
  if (!app) return

  const dateStr = formatDateTime(app.created_at)
  const serviceName = app.service_name || getServiceLabel(app.service_type)
  const customer = app.customer_name || '고객'
  const phone = app.phone || '-'
  const email = app.email || '-'
  const totalAmount = app.total_amount > 0 ? `${Number(app.total_amount).toLocaleString()}원` : '0원'

  const receiptLines = [
    '========================================================================',
    `[EUC COMPANY] ${serviceName} 견적 명세서 / 접수 확인서`,
    '========================================================================',
    `접수번호: #EUC-${app.id || 'N/A'}`,
    `접수일시: ${dateStr}`,
    `처리상태: ${statusNameMap[app.status] || app.status || '접수 대기'}`,
    '------------------------------------------------------------------------',
    `[고객 정보]`,
    `고객명 / 회사명: ${customer}`,
    `연락처: ${phone}`,
    `이메일: ${email}`,
    '------------------------------------------------------------------------',
    `[서비스 견적 세부 내역]`,
    `서비스 구분: ${serviceName}`,
    `총 예상 견적 금액: ${totalAmount}`
  ]

  if (app.details) {
    if (app.details.pickupSummaryText) receiptLines.push(`공항 픽업/샌딩: ${app.details.pickupSummaryText}`)
    if (app.details.guideSummaryText) receiptLines.push(`통역 가이드: ${app.details.guideSummaryText}`)
    if (app.details.guideCost) receiptLines.push(`통역 비용: ${Number(app.details.guideCost).toLocaleString()}원`)
    if (app.details.pickupCost) receiptLines.push(`픽업 비용: ${Number(app.details.pickupCost).toLocaleString()}원`)
    if (app.details.supportHotel) receiptLines.push(`호텔 예약 대행: 요청 (무료 지원)`)
    if (app.details.support1688) receiptLines.push(`1688 사전 비교 데이터: 요청 (무료 지원)`)
    if (app.details.targetItem) receiptLines.push(`조사 희망품목: ${app.details.targetItem}`)
    if (app.details.fullApplicationMessage) {
      receiptLines.push('------------------------------------------------------------------------')
      receiptLines.push('[신청서 전문 내용]')
      receiptLines.push(app.details.fullApplicationMessage)
    }
  }

  receiptLines.push('========================================================================')
  receiptLines.push('담당 문의: 010-9373-1214 / 카카오톡: ericcho0710 / 위챗: china775852')
  receiptLines.push('========================================================================')

  const content = '\uFEFF' + receiptLines.join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const cleanName = customer.replace(/[^a-zA-Z0-9가-힣]/g, '') || '고객'
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url
  a.download = `euchs_견적명세서_${cleanName}_${yyyymmdd}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Excel (UTF-8 BOM CSV) Export Function
const exportApplicationsToExcel = () => {
  const targetList = filteredApplications.value
  if (!targetList || targetList.length === 0) {
    alert('다운로드할 신청 내역 데이터가 없습니다.')
    return
  }

  const headers = [
    '번호',
    '접수일시',
    '구분',
    '고객명',
    '연락처',
    '이메일',
    '총견적금액',
    '신청공항/픽업상세',
    '통역일수/전문분야',
    '투어일정(입국/출국)',
    '희망품목/상세요청사항',
    '처리상태'
  ]

  const rows = targetList.map((app, index) => {
    const num = targetList.length - index
    const dateStr = formatDateTime(app.created_at)
    const serviceName = app.service_name || getServiceLabel(app.service_type)
    const customer = app.customer_name || ''
    const phone = app.phone || ''
    const email = app.email || ''
    const totalAmount = app.total_amount > 0 ? `${Number(app.total_amount).toLocaleString()}원` : '0원'

    let pickup = '-'
    if (app.details?.pickupAirport && app.details?.pickupCourseLabel) {
      pickup = `${app.details.pickupAirport} (${app.details.pickupCourseLabel} / ${app.details.vehicleType || '세단'})`
    } else if (app.details?.pickupSummaryText) {
      pickup = app.details.pickupSummaryText
    } else if (app.details?.pickupAirport) {
      const airportMap = { hangzhou: '항저우 소산 공항', shanghai: '상하이 푸동/홍차오 공항', yiwu: '이우 공항/역' }
      pickup = airportMap[app.details.pickupAirport] || app.details.pickupAirport
    } else if (app.details?.usePickup) {
      pickup = '픽업 신청'
    }

    let guide = '-'
    if (app.details?.guideSummaryText) {
      guide = app.details.guideSummaryText
    } else if (app.details?.guideDays) {
      guide = `${app.details.guideDays}일 (${app.details.guideCategory || '일반'})`
    } else if (app.details?.useGuide) {
      guide = '통역 신청'
    }

    let schedule = '-'
    if (app.details?.arrivalDate || app.details?.returnDate) {
      schedule = `입국:${app.details.arrivalDate || '미정'} / 출국:${app.details.returnDate || '미정'}`
    }

    let memo = app.details?.targetItem || app.memo || app.requirement || app.item_name || ''
    if (app.details?.fullApplicationMessage) {
      memo = app.details.fullApplicationMessage
    }
    memo = memo.replace(/\r?\n/g, ' ').replace(/"/g, '""')

    const statusText = statusNameMap[app.status] || app.status || '접수 대기'

    return [
      `"${num}"`,
      `"${dateStr}"`,
      `"${serviceName.replace(/"/g, '""')}"`,
      `"${customer.replace(/"/g, '""')}"`,
      `"${phone.replace(/"/g, '""')}"`,
      `"${email.replace(/"/g, '""')}"`,
      `"${totalAmount}"`,
      `"${pickup.replace(/"/g, '""')}"`,
      `"${guide.replace(/"/g, '""')}"`,
      `"${schedule.replace(/"/g, '""')}"`,
      `"${memo}"`,
      `"${statusText}"`
    ].join(',')
  })

  // UTF-8 BOM prefix (\uFEFF) ensures 100% Korean support in Microsoft Excel
  const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const filename = `euchs_신청내역_${yyyy}${mm}${dd}.csv`

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ----------------------------------------------------
// TAB 2: Notices State & Logic
// ----------------------------------------------------
const notices = ref([])
const editingNoticeId = ref(null)
const isSavingNotice = ref(false)
const isUploadingNoticeImg = ref(false)
const noticeFileInput = ref(null)

const defaultNoticeImage = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'

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

const fetchNotices = async () => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch notices error:', error)
      } else if (data) {
        notices.value = data
      }
    }
  } catch (err) {
    console.error('Exception fetching notices:', err)
  }
}

const triggerNoticeImageUpload = () => {
  if (noticeFileInput.value) {
    noticeFileInput.value.click()
  }
}

const handleNoticeImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  isUploadingNoticeImg.value = true
  try {
    if (!isSupabaseConfigured()) {
      alert('Supabase 설정이 필요합니다.')
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `notice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const filePath = `notices/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('notices')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Notice Image Upload Error:', uploadError)
      alert('이미지 업로드 실패: ' + uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('notices')
      .getPublicUrl(filePath)

    if (publicUrlData && publicUrlData.publicUrl) {
      noticeForm.value.thumbnail_url = publicUrlData.publicUrl
      alert('공지 썸네일 이미지가 성공적으로 업로드되었습니다!')
    }
  } catch (err) {
    console.error('Notice image upload exception:', err)
    alert('이미지 업로드 오류: ' + err.message)
  } finally {
    isUploadingNoticeImg.value = false
    if (event.target) event.target.value = ''
  }
}

const handleSaveNotice = async () => {
  isSavingNotice.value = true
  try {
    if (!isSupabaseConfigured()) {
      alert('Supabase 연동이 필요합니다.')
      return
    }

    const categoryMap = {
      schedule: '업무일정',
      tour: '시장투어',
      customs: '통관안내',
      shipping: '물류소식',
      general: '일반공지'
    }
    noticeForm.value.category_name = categoryMap[noticeForm.value.category] || '공지'

    const payload = {
      title: noticeForm.value.title,
      category: noticeForm.value.category,
      category_name: noticeForm.value.category_name,
      badge: noticeForm.value.badge || '공지',
      is_pinned: Boolean(noticeForm.value.is_pinned),
      summary: noticeForm.value.summary || '',
      content: noticeForm.value.content || '',
      thumbnail_url: noticeForm.value.thumbnail_url || defaultNoticeImage,
      updated_at: new Date().toISOString()
    }

    if (editingNoticeId.value) {
      const { error } = await supabase
        .from('notices')
        .update(payload)
        .eq('id', editingNoticeId.value)

      if (error) {
        console.error('Supabase Update Error:', error)
        alert('공지사항 수정 실패: ' + error.message)
        return
      }
      alert('공지사항이 성공적으로 수정되었습니다.')
    } else {
      payload.created_at = new Date().toISOString()
      const { error } = await supabase
        .from('notices')
        .insert([payload])

      if (error) {
        console.error('Supabase Insert Error:', error)
        alert('공지사항 등록 실패: ' + error.message)
        return
      }
      alert('새 공지사항이 성공적으로 등록되었습니다.')
    }

    resetNoticeForm()
    await fetchNotices()
  } catch (err) {
    console.error('Notice save exception:', err)
    alert('공지 저장 중 오류가 발생했습니다.')
  } finally {
    isSavingNotice.value = false
  }
}

const editNotice = (item) => {
  editingNoticeId.value = item.id
  noticeForm.value = {
    title: item.title || '',
    category: item.category || 'schedule',
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
    alert('환율, 수수료 및 메인 히어로 비주얼 설정이 성공적으로 저장되었습니다.')
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

const triggerHeroFileUpload = () => {
  if (heroFileInput.value) {
    heroFileInput.value.click()
  }
}

const handleHeroFileUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  isUploadingHero.value = true
  try {
    if (!isSupabaseConfigured()) {
      alert('Supabase 설정이 필요합니다.')
      return
    }

    const fileExt = (file.name.split('.').pop() || '').toLowerCase()
    const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'].includes(fileExt)
    const fileName = `hero_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt || (isVideo ? 'mp4' : 'jpg')}`
    const filePath = `hero/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('notices')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg')
      })

    if (uploadError) {
      console.error('Hero File Upload Error:', uploadError)
      alert('파일 업로드 실패: ' + uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('notices')
      .getPublicUrl(filePath)

    if (publicUrlData && publicUrlData.publicUrl) {
      if (isVideo) {
        settingsForm.value.hero_media_type = 'video_mp4'
      } else {
        settingsForm.value.hero_media_type = 'image'
      }
      settingsForm.value.hero_media_url = publicUrlData.publicUrl
      alert(`${isVideo ? '동영상' : '이미지'} 배경 파일이 성공적으로 업로드되어 등록되었습니다!`)
    }
  } catch (err) {
    console.error('Hero File Upload Exception:', err)
    alert('파일 업로드 중 오류가 발생했습니다: ' + err.message)
  } finally {
    isUploadingHero.value = false
    if (event.target) event.target.value = ''
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
// TAB 4: Staff & Role Management State & Logic
// ----------------------------------------------------
const staffList = ref([])
const isFetchingStaff = ref(false)
const showAddStaffModal = ref(false)
const isCreatingStaff = ref(false)
const newStaffForm = ref({
  name: '',
  email: '',
  password: '',
  role: 'staff'
})

const fetchStaffList = async () => {
  isFetchingStaff.value = true
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Fetch user_roles notice:', error)
      } else if (data && data.length > 0) {
        staffList.value = data
        return
      }
    }

    // 기본 관리자 계정 fallback 표시
    staffList.value = [
      {
        id: 'master-1',
        name: '최고 관리자 (Master)',
        email: currentUser.value?.email || 'admin@euccompany.com',
        role: 'super_admin',
        created_at: new Date().toISOString()
      }
    ]
  } catch (err) {
    console.error('Exception fetching staff list:', err)
  } finally {
    isFetchingStaff.value = false
  }
}

const handleCreateStaff = async () => {
  if (!newStaffForm.value.email || !newStaffForm.value.password) {
    alert('이메일과 비밀번호를 모두 입력해 주세요.')
    return
  }

  isCreatingStaff.value = true
  try {
    if (isSupabaseConfigured()) {
      // 1. Supabase Auth 가입 (옵션: 이메일 가입 트리거)
      try {
        await supabase.auth.signUp({
          email: newStaffForm.value.email,
          password: newStaffForm.value.password,
          options: {
            data: {
              name: newStaffForm.value.name,
              role: newStaffForm.value.role
            }
          }
        })
      } catch (authErr) {
        console.warn('Auth signup notice (may already exist):', authErr)
      }

      // 2. user_roles 테이블에 권한 레코드 INSERT
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert([
          {
            email: newStaffForm.value.email.toLowerCase().trim(),
            name: newStaffForm.value.name.trim(),
            role: newStaffForm.value.role,
            created_at: new Date().toISOString()
          }
        ], { onConflict: 'email' })

      if (roleError) {
        console.error('user_roles upsert error:', roleError)
      }
    }

    // 로컬 목록 즉시 반영
    const newEntry = {
      id: `staff_${Date.now()}`,
      name: newStaffForm.value.name,
      email: newStaffForm.value.email.toLowerCase().trim(),
      role: newStaffForm.value.role,
      created_at: new Date().toISOString()
    }
    staffList.value = [newEntry, ...staffList.value.filter(s => s.email !== newEntry.email)]

    alert(`${newStaffForm.value.name} (${newStaffForm.value.email}) 직원 계정이 등록되었습니다.`)
    showAddStaffModal.value = false
    newStaffForm.value = { name: '', email: '', password: '', role: 'staff' }
    await fetchStaffList()
  } catch (err) {
    console.error('Create staff exception:', err)
    alert('직원 등록 중 오류가 발생했습니다: ' + err.message)
  } finally {
    isCreatingStaff.value = false
  }
}

const updateStaffRole = async (staff) => {
  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: staff.role })
        .eq('email', staff.email)

      if (error) {
        console.error('Update staff role error:', error)
      }
    }
    alert(`${staff.name || staff.email} 님의 권한이 [${staff.role === 'super_admin' ? '최고관리자' : '운영스태프'}] (으)로 변경되었습니다.`)
  } catch (err) {
    console.error('Update staff role exception:', err)
  }
}

const deleteStaff = async (staff) => {
  if (!confirm(`${staff.name || staff.email} 직원의 관리자 접근 권한을 해제하시겠습니까?`)) return

  try {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('email', staff.email)

      if (error) {
        console.error('Delete staff role error:', error)
      }
    }
    staffList.value = staffList.value.filter(s => s.email !== staff.email)
    alert('직원 권한이 정상적으로 해제되었습니다.')
  } catch (err) {
    console.error('Delete staff exception:', err)
  }
}

// ----------------------------------------------------
// Helpers
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

onMounted(async () => {
  const allowed = await verifyAdminAccess()
  if (allowed) {
    fetchApplications()
    fetchNotices()
    loadSettings()
    fetchLiveRefRate()
    fetchStaffList()
  }
})
</script>
