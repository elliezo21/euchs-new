<template>
  <div class="min-h-screen bg-[#070b14] text-white py-10 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
    <div class="max-w-6xl mx-auto space-y-8">
      
      <!-- ---------------------------------------------------- -->
      <!-- Non-logged in State -->
      <!-- ---------------------------------------------------- -->
      <div v-if="!isLoggedIn" class="bg-[#182234] rounded-3xl p-8 sm:p-12 border border-slate-600/60 text-center space-y-6 max-w-xl mx-auto shadow-2xl shadow-black/80 backdrop-blur-md">
        <div class="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-4xl mx-auto shadow-inner">
          <i class="fas fa-user-lock"></i>
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-black text-white">로그인이 필요합니다</h2>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
            회원 로그인 후 신청하신 구매대행, 무역대행, 시장투어 맞춤 견적 및 실시간 주문 처리 상태를 확인하실 수 있습니다.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button 
            type="button" 
            @click="openLoginModal('login')" 
            class="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <i class="fas fa-sign-in-alt"></i>
            <span>로그인하기</span>
          </button>
          <button 
            type="button" 
            @click="openLoginModal('signup')" 
            class="py-3 px-6 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700 transition active:scale-95"
          >
            무료 회원가입
          </button>
        </div>
      </div>

      <!-- ---------------------------------------------------- -->
      <!-- Logged in State -->
      <!-- ---------------------------------------------------- -->
      <div v-else class="space-y-8">
        
        <!-- 1. Profile Header Card -->
        <div class="bg-[#182234] rounded-3xl p-6 sm:p-8 border border-slate-600/60 shadow-xl shadow-black/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-400/40 shrink-0">
              {{ userDisplayName ? userDisplayName.charAt(0) : 'U' }}
            </div>
            <div>
              <div class="flex items-center gap-2.5">
                <h1 class="text-xl sm:text-2xl font-black text-white">{{ userDisplayName }}님</h1>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  일반회원
                </span>
              </div>
              <p class="text-xs text-slate-300 font-mono mt-1 flex items-center gap-2">
                <span><i class="fas fa-envelope text-slate-400 mr-1"></i>{{ userEmail }}</span>
              </p>
            </div>
          </div>

          <!-- Quick Stats (3 Metrics) -->
          <div class="grid grid-cols-3 gap-3 w-full md:w-auto">
            <div class="bg-[#0f172a] border border-slate-700/80 rounded-2xl px-4 py-3 text-center min-w-[90px] shadow-inner">
              <span class="text-[11px] text-slate-400 font-semibold block">총 주문/신청</span>
              <span class="text-lg sm:text-xl font-black text-white">{{ myApplications.length }}건</span>
            </div>
            <div class="bg-[#0f172a] border border-slate-700/80 rounded-2xl px-4 py-3 text-center min-w-[90px] shadow-inner">
              <span class="text-[11px] text-emerald-400 font-semibold block">상담/진행중</span>
              <span class="text-lg sm:text-xl font-black text-emerald-400">{{ activeCount }}건</span>
            </div>
            <div class="bg-[#0f172a] border border-slate-700/80 rounded-2xl px-4 py-3 text-center min-w-[90px] shadow-inner">
              <span class="text-[11px] text-sky-400 font-semibold block">처리완료</span>
              <span class="text-lg sm:text-xl font-black text-sky-400">{{ completedCount }}건</span>
            </div>
          </div>
        </div>

        <!-- 2. Application & Order List Section -->
        <div class="bg-[#182234] rounded-3xl border border-slate-600/60 p-6 sm:p-8 shadow-xl shadow-black/60 space-y-6">
          
          <!-- Section Header & Filter Toolbar -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700/70">
            <div>
              <h2 class="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <i class="fas fa-boxes-packing text-sky-400"></i>
                <span>나의 신청 / 주문 내역</span>
              </h2>
              <p class="text-xs text-slate-300 mt-1">접수하신 서비스 내역과 실시간 처리 상태를 건별로 확인하실 수 있습니다.</p>
            </div>

            <!-- Filters & Refresh -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Service Filter -->
              <select 
                v-model="selectedServiceFilter"
                class="px-3 py-2 rounded-xl bg-[#0f172a] border border-slate-700 text-xs font-semibold text-white outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="all">전체 서비스 ({{ myApplications.length }})</option>
                <option value="purchasing">1688 구매대행</option>
                <option value="trade">OEM/ODM 무역대행</option>
                <option value="rocket_growth">쿠팡 로켓그로스</option>
                <option value="market_tour">이우 시장투어</option>
                <option value="calculator">무역/운임 실시간 견적</option>
              </select>

              <!-- Status Filter -->
              <select 
                v-model="selectedStatusFilter"
                class="px-3 py-2 rounded-xl bg-[#0f172a] border border-slate-700 text-xs font-semibold text-white outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="all">전체 진행상태</option>
                <option value="pending">접수대기</option>
                <option value="consulting">상담/검토중</option>
                <option value="quoted">견적완료</option>
                <option value="completed">처리완료</option>
              </select>

              <!-- Refresh Button -->
              <button 
                type="button" 
                @click="fetchMyApplications" 
                :disabled="isLoading"
                class="p-2 px-3 rounded-xl bg-[#0f172a] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                title="목록 새로고침"
              >
                <i class="fas fa-rotate" :class="{ 'animate-spin': isLoading }"></i>
                <span class="hidden sm:inline">새로고침</span>
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="py-20 text-center space-y-3 text-slate-300">
            <div class="w-10 h-10 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-xs font-medium">주문 및 신청 내역을 실시간으로 조회하고 있습니다...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredMyApplications.length === 0" class="py-16 px-4 text-center space-y-5 bg-[#0f172a] rounded-3xl border border-slate-700/80">
            <div class="w-16 h-16 rounded-3xl bg-[#182234] border border-slate-600 text-slate-300 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <i class="fas fa-receipt"></i>
            </div>
            <div class="space-y-1.5 max-w-md mx-auto">
              <p class="text-base font-bold text-white">아직 신청/주문 내역이 없습니다.</p>
              <p class="text-xs text-slate-300 leading-relaxed">
                1688 구매대행, 무역대행, 이우 시장투어 등 이유씨컴퍼니의 전문 무역 서비스를 간편하게 신청해 보세요.
              </p>
            </div>
            <div class="flex flex-wrap gap-2.5 justify-center pt-2 max-w-xl mx-auto">
              <router-link 
                to="/services/purchasing-agent" 
                class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 active:scale-95"
              >
                <i class="fas fa-cart-shopping text-blue-200"></i>
                <span>1688 구매대행 신청</span>
              </router-link>
              <router-link 
                to="/services/trade-agent" 
                class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 active:scale-95"
              >
                <i class="fas fa-handshake text-emerald-200"></i>
                <span>OEM/ODM 무역대행 의뢰</span>
              </router-link>
              <router-link 
                to="/guide/market-tour" 
                class="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition flex items-center gap-1.5 active:scale-95"
              >
                <i class="fas fa-plane-departure text-amber-200"></i>
                <span>이우 시장투어 신청</span>
              </router-link>
              <router-link 
                to="/tools/calculator" 
                class="px-4 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 shadow-sm transition flex items-center gap-1.5 active:scale-95"
              >
                <i class="fas fa-calculator text-sky-400"></i>
                <span>무역 견적 계산기</span>
              </router-link>
            </div>
          </div>

          <!-- Order / Application Cards List (건별 최신순 정렬) -->
          <div v-else class="space-y-4">
            <div 
              v-for="app in filteredMyApplications" 
              :key="app.id"
              @click="openDetailModal(app)"
              class="group bg-[#182234] hover:bg-[#1e2c42] border border-slate-600/70 hover:border-blue-400 rounded-2xl p-5 sm:p-6 transition-all duration-300 space-y-4 shadow-xl shadow-black/60 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer transform hover:-translate-y-0.5"
            >
              <!-- Card Header: Order No, Service Badge, Date, Status -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-700/80">
                <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                  <!-- Order Number -->
                  <span class="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-mono text-xs font-black border border-sky-500/40 flex items-center gap-1 shadow-inner">
                    <i class="fas fa-hashtag text-[10px] text-sky-400"></i>
                    <span>{{ getOrderNumber(app) }}</span>
                  </span>

                  <!-- Service Type Badge -->
                  <span 
                    class="px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm"
                    :class="getServiceBadgeClass(app.service_type)"
                  >
                    {{ app.service_name || getServiceLabel(app.service_type) }}
                  </span>

                  <!-- Created DateTime -->
                  <span class="text-xs text-slate-300 font-mono flex items-center gap-1">
                    <i class="far fa-calendar-alt text-slate-400 text-[11px]"></i>
                    {{ formatDateTime(app.created_at) }}
                  </span>
                </div>

                <!-- Status Badge -->
                <div class="flex items-center gap-2 self-start sm:self-auto">
                  <span 
                    class="px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm"
                    :class="getStatusBadgeClass(app.status)"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="getStatusDotClass(app.status)"></span>
                    <span>{{ getStatusLabel(app.status) }}</span>
                  </span>
                </div>
              </div>

              <!-- Card Body: Main Representative Title & Financials -->
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                
                <!-- Left: Representative Item Summary & Info (8 cols) -->
                <div class="lg:col-span-8 space-y-2.5">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base sm:text-lg font-black text-white group-hover:text-sky-300 transition">
                      {{ getItemSummaryTitle(app) }}
                    </h3>
                  </div>

                  <!-- Sub-details: Recipient / Shipping / Phone -->
                  <div class="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-200">
                    <span v-if="app.customer_name" class="flex items-center gap-1 bg-[#0f172a] px-2.5 py-1 rounded-lg border border-slate-700">
                      <i class="far fa-user text-slate-400"></i>
                      <span>{{ app.customer_name }}</span>
                    </span>
                    <span v-if="app.phone" class="flex items-center gap-1 font-mono bg-[#0f172a] px-2.5 py-1 rounded-lg border border-slate-700">
                      <i class="fas fa-phone text-slate-400"></i>
                      <span>{{ app.phone }}</span>
                    </span>
                    <span v-if="app.details?.shippingTypeName || app.details?.shippingType" class="flex items-center gap-1 text-sky-300 font-semibold bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-700/60">
                      <i class="fas fa-truck text-sky-400"></i>
                      <span>{{ app.details.shippingTypeName || getShippingTypeFallback(app.details.shippingType) }}</span>
                    </span>
                  </div>

                  <!-- 1-line summary note box -->
                  <p class="text-xs text-slate-200 line-clamp-1 bg-[#0f172a] px-3.5 py-2 rounded-xl border border-slate-700 shadow-inner">
                    <i class="fas fa-circle-info text-sky-400 text-[11px] mr-1.5"></i>
                    {{ getQuickMemo(app) }}
                  </p>
                </div>

                <!-- Right: Price & Quick CTA (4 cols) -->
                <div class="lg:col-span-4 bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-700 shadow-inner flex flex-col justify-between items-start sm:items-end gap-1.5">
                  <span class="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <i class="fas fa-calculator text-[10px] text-slate-400"></i>
                    <span>예상 / 확정 금액</span>
                  </span>
                  <div class="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono tracking-tight">
                    {{ app.total_amount > 0 ? Number(app.total_amount).toLocaleString() + '원' : '상담 후 확정' }}
                  </div>
                </div>

              </div>

              <!-- Card Actions Toolbar -->
              <div class="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-700/80" @click.stop>
                <button 
                  type="button" 
                  @click="openDetailModal(app)" 
                  class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 active:scale-95"
                >
                  <i class="fas fa-magnifying-glass text-blue-200"></i>
                  <span>주문 상세내역 확인</span>
                </button>
                <button 
                  type="button" 
                  @click="downloadReceipt(app)" 
                  class="px-3 py-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700 shadow-sm transition flex items-center gap-1.5 active:scale-95"
                  title="견적서/주문서 CSV 파일 다운로드"
                >
                  <i class="fas fa-file-csv text-emerald-400"></i>
                  <span>견적서 다운로드</span>
                </button>
                <a 
                  href="http://pf.kakao.com/_xmQWsK/chat" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="px-3 py-2 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] font-bold text-xs transition flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <i class="fas fa-comment text-[#3C1E1E]"></i>
                  <span>1:1 카톡 상담</span>
                </a>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>

    <!-- ---------------------------------------------------- -->
    <!-- 3. Application Detail Modal (건별 상세 보기 팝업) -->
    <!-- ---------------------------------------------------- -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="selectedApp" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        @click.self="selectedApp = null"
      >
        <div class="bg-[#182234] border border-slate-600/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl shadow-black space-y-6 text-white max-h-[90vh] overflow-y-auto my-auto">
          
          <!-- Modal Header -->
          <div class="flex items-start justify-between pb-4 border-b border-slate-700/80">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-mono text-xs font-black border border-sky-500/40">
                  {{ getOrderNumber(selectedApp) }}
                </span>
                <span 
                  class="px-2.5 py-0.5 rounded-lg text-xs font-bold"
                  :class="getServiceBadgeClass(selectedApp.service_type)"
                >
                  {{ selectedApp.service_name || getServiceLabel(selectedApp.service_type) }}
                </span>
              </div>
              <h3 class="text-lg sm:text-xl font-black text-white mt-1.5">
                주문 / 견적 상세 내역서
              </h3>
            </div>
            <button 
              type="button" 
              @click="selectedApp = null" 
              class="w-9 h-9 rounded-full bg-[#0f172a] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition shrink-0"
              title="닫기"
            >
              <i class="fas fa-times text-base"></i>
            </button>
          </div>

          <!-- Section 1: Basic Info & Current Status -->
          <div class="bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-slate-700 text-xs space-y-3">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-200">
              <div>
                <span class="text-slate-400 block text-[11px]">진행 상태</span>
                <span class="font-bold text-amber-400 text-sm mt-0.5 inline-block">
                  {{ getStatusLabel(selectedApp.status) }}
                </span>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">신청일시</span>
                <span class="font-mono text-slate-300 mt-0.5 inline-block">{{ formatDateTime(selectedApp.created_at) }}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">신청자명</span>
                <span class="font-bold text-white mt-0.5 inline-block">{{ selectedApp.customer_name }}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[11px]">연락처</span>
                <span class="font-mono text-white mt-0.5 inline-block">{{ selectedApp.phone }}</span>
              </div>
            </div>

            <!-- Total Amount Bar inside Info -->
            <div class="flex items-center justify-between border-t border-slate-700 pt-3 text-xs sm:text-sm">
              <span class="text-slate-300 font-bold">최종 예상 / 결제 금액</span>
              <span class="text-lg sm:text-xl font-black text-amber-400 font-mono">
                {{ selectedApp.total_amount > 0 ? Number(selectedApp.total_amount).toLocaleString() + '원' : '상담 후 확정 안내' }}
              </span>
            </div>
          </div>

          <!-- Section 2: Items List (품목 상세 테이블) -->
          <div v-if="selectedApp.details?.items && selectedApp.details.items.length > 0" class="space-y-2">
            <h4 class="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <i class="fas fa-list-ol"></i>
              <span>신청 품목 목록 (총 {{ selectedApp.details.items.length }}종)</span>
            </h4>
            
            <div class="bg-[#0f172a] rounded-2xl border border-slate-700 overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-200">
                  <thead class="bg-slate-900/90 text-slate-300 font-bold border-b border-slate-700 text-[11px]">
                    <tr>
                      <th class="py-2.5 px-3">No</th>
                      <th class="py-2.5 px-3">상품명 / 옵션</th>
                      <th class="py-2.5 px-3 text-center">수량</th>
                      <th class="py-2.5 px-3 text-right">단가</th>
                      <th class="py-2.5 px-3 text-center">상품링크</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/80">
                    <tr v-for="(item, idx) in selectedApp.details.items" :key="idx" class="hover:bg-slate-800/40">
                      <td class="py-2.5 px-3 font-mono text-slate-400">{{ idx + 1 }}</td>
                      <td class="py-2.5 px-3 font-medium">
                        <div class="text-white font-bold">{{ item.name || item.title || '품목 ' + (idx + 1) }}</div>
                        <div v-if="item.option" class="text-[11px] text-slate-400">옵션: {{ item.option }}</div>
                      </td>
                      <td class="py-2.5 px-3 text-center font-bold text-white font-mono">
                        {{ (item.qty || item.quantity || 1).toLocaleString() }}개
                      </td>
                      <td class="py-2.5 px-3 text-right font-mono text-amber-300 font-bold">
                        <div v-if="item.priceCny || item.unitPrice">
                          ¥{{ (item.priceCny || item.unitPrice).toLocaleString() }}
                        </div>
                        <div v-if="item.priceKrw" class="text-[10px] text-slate-400 font-normal">
                          (₩{{ Number(item.priceKrw).toLocaleString() }})
                        </div>
                      </td>
                      <td class="py-2.5 px-3 text-center">
                        <a 
                          v-if="item.url || item.link" 
                          :href="item.url || item.link" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          class="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/40 text-[10px] font-bold transition inline-flex items-center gap-1"
                        >
                          <span>보기</span>
                          <i class="fas fa-external-link-alt text-[8px]"></i>
                        </a>
                        <span v-else class="text-slate-500 text-[11px]">-</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Section 3: Shipping & Customs Info (배송 및 통관 정보) -->
          <div v-if="selectedApp.details?.address || selectedApp.details?.customsCode || selectedApp.details?.shippingTypeName || selectedApp.details?.shippingType" class="space-y-2">
            <h4 class="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <i class="fas fa-truck-fast"></i>
              <span>배송지 및 수령 정보</span>
            </h4>
            <div class="bg-[#0f172a] p-4 rounded-2xl border border-slate-700 text-xs space-y-2 text-slate-200">
              <div v-if="selectedApp.details.address" class="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span class="text-slate-400 shrink-0">수령지 주소:</span>
                <span class="text-white font-medium text-right sm:text-left">{{ selectedApp.details.address }}</span>
              </div>
              <div v-if="selectedApp.details.customsCode" class="flex justify-between">
                <span class="text-slate-400">개인통관고유부호:</span>
                <span class="font-mono text-sky-300 font-bold">{{ selectedApp.details.customsCode }}</span>
              </div>
              <div v-if="selectedApp.details.shippingTypeName || selectedApp.details.shippingType" class="flex justify-between">
                <span class="text-slate-400">배송 방식:</span>
                <span class="text-white font-bold">
                  {{ selectedApp.details.shippingTypeName || getShippingTypeFallback(selectedApp.details.shippingType) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Section 4: Service Specific Options & Additional Services -->
          <div v-if="hasAdditionalServicesOrDetails(selectedApp)" class="space-y-2">
            <h4 class="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <i class="fas fa-sliders"></i>
              <span>부가서비스 및 맞춤 옵션</span>
            </h4>
            
            <div class="bg-[#0f172a] p-4 rounded-2xl border border-slate-700 text-xs space-y-2.5 text-slate-200">
              <!-- Badges for purchasing / rocket growth services -->
              <div v-if="selectedApp.details?.additionalServices || selectedApp.details?.services" class="space-y-1.5">
                <span class="text-slate-400 block text-[11px]">선택된 부가서비스:</span>
                <div class="flex flex-wrap gap-1.5">
                  <template v-if="selectedApp.details.additionalServices">
                    <span v-if="selectedApp.details.additionalServices.precision_inspection" class="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold">기본 정밀검수</span>
                    <span v-if="selectedApp.details.additionalServices.origin_labeling" class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">원산지 표기</span>
                    <span v-if="selectedApp.details.additionalServices.packaging_reinforcement" class="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold">포장 보강</span>
                    <span v-if="selectedApp.details.additionalServices.photo_inspection" class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">검품 사진 촬영</span>
                    <span v-if="selectedApp.details.additionalServices.barcode_attachment" class="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold">바코드 부착</span>
                  </template>
                </div>
              </div>

              <!-- Market Tour options -->
              <template v-if="selectedApp.service_type === 'market_tour'">
                <div v-if="selectedApp.details?.pickupSummaryText" class="flex justify-between">
                  <span class="text-slate-400">공항 픽업/샌딩:</span>
                  <span class="text-slate-200 font-bold">{{ selectedApp.details.pickupSummaryText }}</span>
                </div>
                <div v-if="selectedApp.details?.guideSummaryText" class="flex justify-between">
                  <span class="text-slate-400">통역 가이드:</span>
                  <span class="text-slate-200 font-bold">{{ selectedApp.details.guideSummaryText }}</span>
                </div>
                <div v-if="selectedApp.details?.targetItem" class="flex justify-between">
                  <span class="text-slate-400">희망 시장조사 품목:</span>
                  <span class="text-amber-300 font-bold">{{ selectedApp.details.targetItem }}</span>
                </div>
              </template>

              <!-- Trade OEM/ODM options -->
              <template v-if="selectedApp.service_type === 'trade'">
                <div v-if="selectedApp.details?.category" class="flex justify-between">
                  <span class="text-slate-400">희망 품목:</span>
                  <span class="text-white font-bold">{{ selectedApp.details.category }}</span>
                </div>
                <div v-if="selectedApp.details?.moq" class="flex justify-between">
                  <span class="text-slate-400">목표 수량 (MOQ):</span>
                  <span class="text-white font-mono">{{ selectedApp.details.moq }}</span>
                </div>
                <div v-if="selectedApp.details?.targetPrice" class="flex justify-between">
                  <span class="text-slate-400">목표 단가:</span>
                  <span class="text-white font-mono">{{ selectedApp.details.targetPrice }}</span>
                </div>
                <div v-if="selectedApp.details?.needInspectionTrip" class="flex justify-between">
                  <span class="text-slate-400">현지 공장 실사 동행:</span>
                  <span class="text-emerald-400 font-bold">동행 신청함</span>
                </div>
              </template>

              <!-- Calculator options -->
              <template v-if="selectedApp.service_type === 'calculator'">
                <div v-if="selectedApp.details?.shippingModeName" class="flex justify-between">
                  <span class="text-slate-400">운송 방식:</span>
                  <span class="text-sky-300 font-bold">{{ selectedApp.details.shippingModeName }}</span>
                </div>
                <div v-if="selectedApp.details?.cbm" class="flex justify-between">
                  <span class="text-slate-400">화물 규격:</span>
                  <span class="text-slate-200">{{ selectedApp.details.cbm }} CBM / {{ selectedApp.details.weightKg || 0 }} kg</span>
                </div>
                <div v-if="selectedApp.details?.freightCostKrw" class="flex justify-between">
                  <span class="text-slate-400">국제 운임료:</span>
                  <span class="font-mono text-white">₩{{ Number(selectedApp.details.freightCostKrw).toLocaleString() }}</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Section 5: Customer Memo / Full Message -->
          <div v-if="selectedApp.memo || selectedApp.details?.fullApplicationMessage" class="space-y-2">
            <h4 class="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <i class="fas fa-comment-dots"></i>
              <span>고객 요청사항 / 신청 메모</span>
            </h4>
            <div class="bg-[#0f172a] p-4 rounded-2xl border border-slate-700 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {{ selectedApp.memo || selectedApp.details?.fullApplicationMessage }}
            </div>
          </div>

          <!-- Section 6: Guide Notice Box -->
          <div class="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/50 flex items-start gap-3 text-xs">
            <i class="fas fa-headset text-sky-400 text-base shrink-0 mt-0.5"></i>
            <div class="space-y-1">
              <p class="font-bold text-sky-200">담당 매니저 1:1 안내</p>
              <p class="text-slate-300 text-[11px] leading-relaxed">
                주문서 확인 후 중국 현지 실재고/단가 검토가 완료되면 카카오톡 및 문자로 최종 정산서를 전달해 드립니다. 문의사항은 아래 1:1 상담창을 이용해 주세요.
              </p>
            </div>
          </div>

          <!-- Modal Actions Footer -->
          <div class="flex flex-wrap gap-2.5 justify-end pt-3 border-t border-slate-700/80">
            <button 
              type="button" 
              @click="downloadReceipt(selectedApp)" 
              class="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <i class="fas fa-file-csv"></i>
              <span>견적서(CSV) 다운로드</span>
            </button>
            <a 
              href="http://pf.kakao.com/_xmQWsK/chat" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="py-2.5 px-4 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] text-[#3C1E1E] font-bold text-xs transition flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <i class="fas fa-comment text-[#3C1E1E]"></i>
              <span>카톡 1:1 상담 연결</span>
            </a>
            <button 
              type="button" 
              @click="selectedApp = null" 
              class="py-2.5 px-4 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700 transition"
            >
              닫기
            </button>
          </div>

        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  currentUser,
  isLoggedIn,
  userDisplayName,
  userEmail,
  openLoginModal
} from '@/lib/auth'

const myApplications = ref([])
const isLoading = ref(false)
const selectedServiceFilter = ref('all')
const selectedStatusFilter = ref('all')
const selectedApp = ref(null)

const activeCount = computed(() => {
  return myApplications.value.filter(a => 
    a.status === 'pending' || 
    a.status === 'consulting' || 
    a.status === '접수대기' || 
    a.status === '상담진행' ||
    a.status === '검토중' ||
    a.status === '진행중'
  ).length
})

const completedCount = computed(() => {
  return myApplications.value.filter(a => 
    a.status === 'completed' || 
    a.status === '처리완료' ||
    a.status === '완료'
  ).length
})

const filteredMyApplications = computed(() => {
  return myApplications.value.filter(a => {
    // 1. Service Filter
    if (selectedServiceFilter.value !== 'all') {
      const sf = selectedServiceFilter.value
      if (sf === 'calculator' && (a.service_type !== 'calculator' && a.service_type !== 'logistics_estimate')) return false
      if (sf === 'market_tour' && a.service_type !== 'market_tour') return false
      if (sf === 'purchasing' && (a.service_type !== 'purchasing' && a.service_type !== 'purchasing_agent')) return false
      if (sf === 'trade' && (a.service_type !== 'trade' && a.service_type !== 'trade_agent')) return false
      if (sf === 'rocket_growth' && a.service_type !== 'rocket_growth') return false
    }

    // 2. Status Filter
    if (selectedStatusFilter.value !== 'all') {
      const st = selectedStatusFilter.value
      if (st === 'pending' && (a.status !== 'pending' && a.status !== '접수대기')) return false
      if (st === 'consulting' && (a.status !== 'consulting' && a.status !== '상담진행' && a.status !== '검토중' && a.status !== '진행중')) return false
      if (st === 'quoted' && (a.status !== 'quoted' && a.status !== '견적완료')) return false
      if (st === 'completed' && (a.status !== 'completed' && a.status !== '처리완료' && a.status !== '완료')) return false
    }

    return true
  })
})

const fetchMyApplications = async () => {
  if (!currentUser.value) return
  isLoading.value = true

  try {
    if (isSupabaseConfigured()) {
      const userPhone = currentUser.value.user_metadata?.phone || ''
      const email = currentUser.value.email || ''
      const uid = currentUser.value.id

      // Query by user_id OR email OR phone
      let query = supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (uid && email && userPhone) {
        query = query.or(`user_id.eq.${uid},email.eq.${email},phone.eq.${userPhone}`)
      } else if (uid && email) {
        query = query.or(`user_id.eq.${uid},email.eq.${email}`)
      } else if (uid) {
        query = query.eq('user_id', uid)
      } else if (email) {
        query = query.eq('email', email)
      }

      const { data, error } = await query

      if (error) {
        console.error('Fetch my applications error:', error)
      } else if (data) {
        myApplications.value = data
      }
    }
  } catch (err) {
    console.error('Fetch my applications exception:', err)
  } finally {
    isLoading.value = false
  }
}

const openDetailModal = (app) => {
  selectedApp.value = app
}

/**
 * 주문번호 생성: #EUC-YYYYMMDD-0001
 */
const getOrderNumber = (app) => {
  if (!app) return '#EUC-0001'
  if (app.created_at) {
    const d = new Date(app.created_at)
    if (!isNaN(d.getTime())) {
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      return `#EUC-${ymd}-${String(app.id || 1).padStart(3, '0')}`
    }
  }
  return `#EUC-${String(app.id || 1).padStart(4, '0')}`
}

/**
 * 건별 대표 상품/신청 품목 요약 타이틀
 */
const getItemSummaryTitle = (app) => {
  if (!app) return '신청 내역'

  // 1. 구매대행 / 로켓그로스 품목 리스트 요약
  if (app.details?.items && Array.isArray(app.details.items) && app.details.items.length > 0) {
    const firstItem = app.details.items[0]
    const firstName = firstItem.name || firstItem.title || '주문 상품'
    if (app.details.items.length === 1) {
      return firstName
    }
    return `${firstName} 외 ${app.details.items.length - 1}종`
  }

  // 2. 무역대행
  if (app.service_type === 'trade' || app.service_type === 'trade_agent') {
    if (app.details?.category) {
      return `품목: ${app.details.category} (MOQ ${app.details.moq || '협의'})`
    }
    return 'OEM/ODM 맞춤 무역 소싱 의뢰'
  }

  // 3. 시장투어
  if (app.service_type === 'market_tour') {
    if (app.details?.targetItem) {
      return `시장조사: ${app.details.targetItem} (${app.details.durationDays || 2}일 코스)`
    }
    return '이우 푸텐시장 맞춤 가이드 투어 신청'
  }

  // 4. 운임 계산기
  if (app.service_type === 'calculator' || app.service_type === 'logistics_estimate') {
    if (app.details?.shippingModeName) {
      return `[${app.details.shippingModeName}] ${app.details.cbm || 0} CBM / ${app.details.weightKg || 0} kg`
    }
    return '무역/운임 실시간 견적서'
  }

  return app.service_name || getServiceLabel(app.service_type)
}

/**
 * 1줄 요약 메모
 */
const getQuickMemo = (app) => {
  if (app.details?.additionalServicesSummary) {
    return `부가서비스: ${app.details.additionalServicesSummary}`
  }
  if (app.details?.address) {
    return `배송지: ${app.details.address}`
  }
  if (app.details?.pickupSummaryText) {
    return `공항픽업: ${app.details.pickupSummaryText}`
  }
  if (app.memo) {
    return app.memo.split('\n')[0]
  }
  return '담당 매니저 실시간 배정 및 접수 검토 중입니다.'
}

const getServiceLabel = (type) => {
  switch (type) {
    case 'market_tour': return '이우 시장투어'
    case 'rocket_growth': return '쿠팡 로켓그로스'
    case 'purchasing':
    case 'purchasing_agent': return '1688 구매대행'
    case 'trade':
    case 'trade_agent': return 'OEM/ODM 무역대행'
    case 'calculator':
    case 'logistics_estimate': return '무역/운임 실시간 견적'
    default: return '서비스 신청'
  }
}

const getServiceBadgeClass = (type) => {
  switch (type) {
    case 'market_tour': return 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
    case 'rocket_growth': return 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
    case 'purchasing':
    case 'purchasing_agent': return 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
    case 'trade':
    case 'trade_agent': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    case 'calculator':
    case 'logistics_estimate': return 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
    default: return 'bg-slate-800 text-slate-300 border border-slate-700'
  }
}

const getStatusLabel = (status) => {
  switch (status) {
    case 'pending':
    case '접수대기': return '접수대기'
    case 'consulting':
    case '상담진행':
    case '검토중': return '상담/검토중'
    case 'quoted':
    case '견적완료': return '견적완료'
    case 'completed':
    case '처리완료':
    case '완료': return '처리완료'
    case 'cancelled':
    case '취소/보류': return '취소/보류'
    default: return status || '접수대기'
  }
}

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'pending':
    case '접수대기': return 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
    case 'consulting':
    case '상담진행':
    case '검토중': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    case 'quoted':
    case '견적완료': return 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
    case 'completed':
    case '처리완료':
    case '완료': return 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
    case 'cancelled':
    case '취소/보류': return 'bg-slate-800 text-slate-400 border border-slate-700'
    default: return 'bg-slate-800 text-slate-300 border border-slate-700'
  }
}

const getStatusDotClass = (status) => {
  switch (status) {
    case 'pending':
    case '접수대기': return 'bg-amber-400 animate-pulse'
    case 'consulting':
    case '상담진행':
    case '검토중': return 'bg-emerald-400 animate-pulse'
    case 'quoted':
    case '견적완료': return 'bg-purple-400'
    case 'completed':
    case '처리완료':
    case '완료': return 'bg-teal-400'
    default: return 'bg-slate-500'
  }
}

const getShippingTypeFallback = (type) => {
  switch (type) {
    case 'air': return '항공특송(긴급)'
    case 'lcl': return '사업자 LCL콘솔'
    case 'other_customs': return '기타 통관'
    default: return '해운특송(기본)'
  }
}

const hasAdditionalServicesOrDetails = (app) => {
  if (!app || !app.details) return false
  const d = app.details
  return Boolean(
    d.additionalServices || 
    d.services || 
    d.pickupSummaryText || 
    d.guideSummaryText || 
    d.targetItem || 
    d.category || 
    d.shippingModeName
  )
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

// Download Receipt (UTF-8 BOM CSV)
const downloadReceipt = (app) => {
  if (!app) return

  const dateStr = formatDateTime(app.created_at)
  const serviceName = app.service_name || getServiceLabel(app.service_type)
  const orderNum = getOrderNumber(app)
  const customer = app.customer_name || '고객'
  const phone = app.phone || '-'
  const email = app.email || '-'
  const totalAmount = app.total_amount > 0 ? `${Number(app.total_amount).toLocaleString()}원` : '별도 안내'

  const lines = [
    '========================================================================',
    `[EUC COMPANY] ${serviceName} 주문 명세서 / 고객 확인서`,
    '========================================================================',
    `주문/접수번호: ${orderNum}`,
    `접수일시: ${dateStr}`,
    `처리상태: ${getStatusLabel(app.status)}`,
    '------------------------------------------------------------------------',
    `[신청 고객 정보]`,
    `고객명: ${customer}`,
    `연락처: ${phone}`,
    `이메일: ${email}`,
    '------------------------------------------------------------------------',
    `[서비스 견적 세부 내역]`,
    `서비스 명칭: ${serviceName}`,
    `대표 품목: ${getItemSummaryTitle(app)}`,
    `총 예상 견적 금액: ${totalAmount}`
  ]

  if (app.details) {
    if (app.details.pickupSummaryText) lines.push(`공항 픽업/샌딩: ${app.details.pickupSummaryText}`)
    if (app.details.guideSummaryText) lines.push(`통역 가이드: ${app.details.guideSummaryText}`)
    if (app.details.shippingModeName) lines.push(`운송 방식: ${app.details.shippingModeName}`)
    if (app.details.cbm) lines.push(`화물 부피(CBM) / 중량: ${app.details.cbm} CBM / ${app.details.weightKg || 0} kg`)
    if (app.details.shippingTypeName || app.details.shippingType) {
      lines.push(`배송 방식: ${app.details.shippingTypeName || getShippingTypeFallback(app.details.shippingType)}`)
    }
    if (app.details.customsCode) lines.push(`개인통관고유부호: ${app.details.customsCode}`)
    if (app.details.address) lines.push(`수령지 주소: ${app.details.address}`)
    if (app.details.additionalServicesSummary) lines.push(`부가서비스: ${app.details.additionalServicesSummary}`)

    if (app.details.items && Array.isArray(app.details.items) && app.details.items.length > 0) {
      lines.push('------------------------------------------------------------------------')
      lines.push('[신청 품목 세부 리스트]')
      app.details.items.forEach((item, i) => {
        lines.push(`${i + 1}. 상품명: ${item.name || item.title || '품목 ' + (i + 1)} | 옵션: ${item.option || '-'} | 수량: ${item.qty || item.quantity || 1}개 | 단가: ¥${item.priceCny || item.unitPrice || 0} | URL: ${item.url || item.link || '-'}`)
      })
    }

    if (app.memo) {
      lines.push('------------------------------------------------------------------------')
      lines.push('[고객 요청사항]')
      lines.push(app.memo)
    }
  }

  lines.push('========================================================================')
  lines.push('상담 및 고객센터: 010-9373-1214 / 중국직통: +86 195-2407-7350 / 카카오톡: 이유씨컴퍼니 / 위챗: euchskorea')
  lines.push('========================================================================')

  const content = '\uFEFF' + lines.join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url
  a.download = `euchs_주문명세서_${serviceName}_${yyyymmdd}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  fetchMyApplications()
})
</script>

