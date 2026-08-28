<template>
  <div class="bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
    
    <!-- ======================================================== -->
    <!-- 1. HERO SECTION (Global Trade Visual with Autoplay Video Background) -->
    <!-- ======================================================== -->
    <section class="relative bg-slate-950 text-white overflow-hidden pt-16 pb-20 sm:pt-28 sm:pb-36 min-h-[620px] flex items-center justify-center">
      
      <!-- Video / Media Background Layer -->
      <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
        
        <!-- Case 1: MP4 / WebM Direct Video (Auto-looping muted background) -->
        <video 
          v-if="heroMediaType === 'video_mp4' || !heroMediaType"
          ref="heroVideoRef"
          :src="heroMediaUrl"
          autoplay 
          loop 
          muted 
          playsinline
          webkit-playsinline
          x5-playsinline
          preload="auto"
          class="w-full h-full object-cover scale-105 transition-opacity duration-700 bg-slate-950"
        >
          <source :src="heroMediaUrl" type="video/mp4" />
          <source src="https://upload.wikimedia.org/wikipedia/commons/transcoded/7/7a/Container_Ship_Dashcam_Around_The_World_In_70_Days_Timelapse%2C_4k%2C_60fps.webm/Container_Ship_Dashcam_Around_The_World_In_70_Days_Timelapse%2C_4k%2C_60fps.webm.480p.vp9.webm" type="video/webm" />
        </video>

        <!-- Case 2: YouTube Iframe -->
        <iframe 
          v-else-if="heroMediaType === 'youtube'"
          :src="heroYoutubeEmbedUrl"
          class="w-full h-full object-cover scale-150 md:scale-125 pointer-events-none"
          frameborder="0"
          allow="autoplay; encrypted-media"
        ></iframe>

        <!-- Case 3: High-Res Image -->
        <img 
          v-else
          :src="heroMediaUrl" 
          alt="EUC Company Hero Background" 
          class="w-full h-full object-cover scale-105"
        />

        <!-- Dark Translucent Overlay (bg-black/60 for sharp, elegant white typography) -->
        <div 
          class="absolute inset-0 bg-black/60 transition-opacity duration-500"
          :style="{ opacity: (heroOverlayOpacity !== undefined ? heroOverlayOpacity : 60) / 100 }"
        ></div>

        <!-- Ambient Glow & Top/Bottom Vignette Gradients for Luxury Aesthetic -->
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80"></div>
        <div class="absolute -top-32 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div class="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          
          <!-- Top Badge -->
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs sm:text-sm font-bold tracking-wide backdrop-blur-md shadow-lg">
            <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            <span>15 YEARS OF EXCELLENCE IN GLOBAL TRADE & SOURCING</span>
          </div>

          <!-- Headline -->
          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-white drop-shadow-md">
            15년 무역 노하우,<br />
            중국 비즈니스의 가장 확실한<br class="hidden sm:inline" />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
              올인원 B2B 무역 파트너
            </span>
          </h1>

          <!-- Description -->
          <p class="text-sm sm:text-base lg:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed font-normal drop-shadow">
            세계 최대 이우(푸텐)시장 조사부터 1688 구매대행, OEM/ODM 맞춤 제조, 쿠팡 로켓그로스 밀크런 입고, 한·중 FTA 원산지증명서 및 신속 통관까지 원스톱으로 지원합니다.
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <router-link 
              to="/mall"
              class="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-blue-600/40 hover:shadow-blue-500/60 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-2 border border-blue-400/30"
            >
              <i class="fas fa-shopping-cart text-blue-200"></i>
              <span>1688 구매하러 가기</span>
              <i class="fas fa-arrow-right text-xs text-blue-200"></i>
            </router-link>

            <router-link 
              to="/guide/market-tour"
              class="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-extrabold text-sm sm:text-base backdrop-blur-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-2"
            >
              <i class="fas fa-plane-departure text-amber-400"></i>
              <span>이우 푸텐시장 투어 신청</span>
            </router-link>

            <a 
              href="http://pf.kakao.com/_xmQWsK/chat" 
              target="_blank"
              class="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-sm sm:text-base backdrop-blur-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center gap-2"
            >
              <i class="fas fa-comment text-yellow-400"></i>
              <span>1:1 실시간 상담</span>
            </a>
          </div>

          <!-- Trust Counter Metric Badges -->
          <div class="pt-8 sm:pt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-t border-slate-800/80 text-left">
            <div class="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/90 backdrop-blur-md shadow-lg">
              <span class="block text-2xl sm:text-3xl font-black text-blue-400">15+</span>
              <span class="text-xs text-slate-300 font-medium">중국 무역 전문 업력 (Years)</span>
            </div>
            <div class="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/90 backdrop-blur-md shadow-lg">
              <span class="block text-2xl sm:text-3xl font-black text-amber-400">50,000+</span>
              <span class="text-xs text-slate-300 font-medium">누적 수입 대행 화물 건수</span>
            </div>
            <div class="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/90 backdrop-blur-md shadow-lg">
              <span class="block text-2xl sm:text-3xl font-black text-emerald-400">99.8%</span>
              <span class="text-xs text-slate-300 font-medium">안전 통관 및 정시 출고율</span>
            </div>
            <div class="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/90 backdrop-blur-md shadow-lg">
              <span class="block text-xl sm:text-2xl font-black text-purple-400">이우·광저우</span>
              <span class="text-xs text-slate-300 font-medium">현지 지사 & 100% 직영 창고</span>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 1.5. LARGE 1688 GLOBAL SOURCING SEARCH BAR SECTION -->
    <!-- ======================================================== -->
    <section class="py-10 sm:py-14 bg-white border-b border-gray-200 shadow-sm relative z-20">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center space-y-2 mb-6">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
            <i class="fas fa-fire-alt text-rose-500"></i>
            <span>1688 실시간 도매 소싱 & AI 자동 번역 검색</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            중국 1688 도매 상품, <span class="text-rose-600">한글로 검색</span>하세요!
          </h2>
          <p class="text-xs sm:text-sm text-gray-500">
            원하는 상품명을 한글로 입력하시면 AI 실시간 번역을 거쳐 중국 1688 최신 도매가와 상품을 찾아드립니다.
          </p>
        </div>

        <!-- Search Bar Input Form -->
        <form @submit.prevent="handleMain1688Search(mainSearchQuery)" class="space-y-4">
          <div class="flex flex-col sm:flex-row items-stretch rounded-2xl bg-white border-2 border-rose-500/80 p-1.5 shadow-lg shadow-rose-500/10 focus-within:border-rose-600 focus-within:ring-4 focus-within:ring-rose-100 transition-all">
            
            <!-- Platform Dropdown -->
            <div class="flex items-center px-4 py-3 sm:py-0 border-b sm:border-b-0 sm:border-r border-gray-200 bg-gray-50/70 sm:rounded-l-xl text-xs sm:text-sm font-black text-gray-800 shrink-0">
              <i class="fas fa-cubes text-rose-600 mr-2"></i>
              <span>1688 도매검색</span>
            </div>

            <!-- Search Input -->
            <div class="relative flex-1 flex items-center">
              <input
                v-model="mainSearchQuery"
                type="text"
                placeholder="상품명 한글 입력 또는 1688 상품 링크(URL)를 붙여넣으세요"
                class="w-full px-4 py-3.5 sm:py-4 text-sm sm:text-base font-medium text-gray-900 placeholder:text-gray-400 bg-transparent outline-none"
              />
              <button 
                v-if="mainSearchQuery" 
                type="button" 
                @click="mainSearchQuery = ''" 
                class="pr-3 text-gray-400 hover:text-gray-600 transition"
              >
                <i class="fas fa-times-circle"></i>
              </button>
            </div>

            <!-- Search Submit Button -->
            <button
              type="submit"
              class="px-7 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600 text-white font-extrabold text-sm sm:text-base shadow-md shadow-rose-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <i class="fas fa-search text-base"></i>
              <span>1688 검색</span>
            </button>
          </div>

          <!-- Popular / Recommended Tags -->
          <div class="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs">
            <span class="text-gray-400 font-bold flex items-center gap-1 mr-1">
              <i class="fas fa-tags text-rose-500"></i> 인기 키워드:
            </span>
            <button
              v-for="tag in popularSearchTags"
              :key="tag"
              type="button"
              @click="handleMain1688Search(tag)"
              class="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 border border-gray-200 hover:border-rose-300 font-medium transition active:scale-95"
            >
              #{{ tag }}
            </button>
          </div>

          <!-- 1688 Sourcing Mall Direct Button -->
          <div class="pt-2 flex justify-center">
            <router-link
              to="/mall"
              class="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/35 hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
            >
              <span class="w-5 h-5 rounded-md bg-white text-rose-600 flex items-center justify-center font-black text-[10px] shadow-sm">
                1688
              </span>
              <span>1688 실시간 소싱몰 바로가기</span>
              <i class="fas fa-arrow-right text-xs"></i>
            </router-link>
          </div>
        </form>

      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 2. BENTO GRID DASHBOARD (Real-Time Rates, Notices & Quick Hub) -->
    <!-- ======================================================== -->
    <section class="py-16 sm:py-24 bg-slate-900 text-white relative border-t border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <!-- Section Header -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span class="text-xs font-bold text-blue-400 tracking-wider uppercase flex items-center gap-1.5 mb-2">
              <i class="fas fa-chart-line"></i> REAL-TIME TRADE DASHBOARD
            </span>
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              실시간 비즈니스 데이터 & 공지 피드
            </h2>
          </div>
          <p class="text-xs sm:text-sm text-slate-400 max-w-md">
            당일 고시 환율과 최신 통관·물류 일정 공지, 서비스 신청 현황을 실시간으로 확인하세요.
          </p>
        </div>

        <!-- Bento Grid (3 Cards) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          <!-- Bento Card A: Real-Time Exchange Rate (4 cols) -->
          <div class="lg:col-span-4 bg-gradient-to-br from-blue-900/80 via-slate-900 to-indigo-950/90 rounded-3xl p-6 sm:p-7 border border-blue-700/40 shadow-xl flex flex-col justify-between relative overflow-hidden group">
            <div class="absolute -right-8 -bottom-8 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition duration-500"></div>

            <div class="space-y-5">
              <div class="flex items-center justify-between">
                <span class="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-extrabold rounded-full">
                  실시간 환율 연동
                </span>
                <span class="text-[11px] text-slate-400 flex items-center gap-1">
                  <i class="fas fa-sync-alt text-[10px] animate-spin-slow"></i> 10분 자동 갱신
                </span>
              </div>

              <div>
                <h3 class="text-xs font-bold text-slate-400 uppercase">중국 위안화 (CNY/RMB)</h3>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="text-3xl sm:text-4xl font-black text-white">
                    1 RMB = {{ customRate }}원
                  </span>
                </div>
                <span class="text-xs font-semibold text-blue-300 mt-1 block">
                  {{ rateModeDesc }}
                </span>
              </div>

              <!-- Rate Comparison Sub Box -->
              <div class="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1 text-xs">
                <div class="flex items-center justify-between text-slate-400">
                  <span>국제 고시 환율 (참고치)</span>
                  <span class="font-bold text-amber-300">{{ liveRate ? `${liveRate}원` : '조회 중...' }}</span>
                </div>
                <div class="flex items-center justify-between text-slate-400">
                  <span>기본 구매대행 수수료율</span>
                  <span class="font-bold text-emerald-400">{{ agencyFeeRate }}% (최소 1만원)</span>
                </div>
              </div>
            </div>

            <!-- Card A Bottom Action -->
            <div class="pt-6">
              <router-link 
                to="/tools/calculator"
                class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 group-hover:scale-[1.02]"
              >
                <i class="fas fa-calculator"></i>
                <span>무역/물류비·관부가세 계산기 열기 &rarr;</span>
              </router-link>
            </div>
          </div>

          <!-- Bento Card B: Real-Time Notices Feed (5 cols) -->
          <div class="lg:col-span-5 bg-slate-900/80 rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div class="space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-800">
                <div class="flex items-center gap-2">
                  <i class="fas fa-bullhorn text-blue-400"></i>
                  <h3 class="text-sm font-bold text-white">EUC 공지사항 & 주요 일정</h3>
                </div>
                <router-link to="/community/notice" class="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                  전체보기 &gt;
                </router-link>
              </div>

              <!-- Notices List -->
              <div class="space-y-3">
                <div 
                  v-for="item in noticesList.slice(0, 3)" 
                  :key="item.id"
                  @click="openNoticeModal(item)"
                  class="p-3 bg-slate-950/60 hover:bg-slate-800/80 rounded-2xl border border-slate-800/80 transition cursor-pointer group space-y-1"
                >
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/20">
                      {{ item.badge || item.category_name || '공지' }}
                    </span>
                    <span class="text-slate-500">{{ formatDate(item.created_at || item.date) }}</span>
                  </div>
                  <h4 class="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition truncate">
                    {{ item.title }}
                  </h4>
                  <p class="text-[11px] text-slate-400 line-clamp-1">
                    {{ item.summary || item.desc }}
                  </p>
                </div>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>연휴 일정 및 통관 변경사항 실시간 안내</span>
              <router-link to="/community/faq" class="text-slate-300 hover:text-white font-semibold">
                FAQ 바로가기 &rarr;
              </router-link>
            </div>
          </div>

          <!-- Bento Card C: Quick Service Hub (3 cols) -->
          <div class="lg:col-span-3 bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <span class="text-xs font-bold text-amber-400 uppercase tracking-wide block mb-1">
                QUICK ACCESS
              </span>
              <h3 class="text-base font-black text-white">원클릭 서비스 바로가기</h3>
            </div>

            <div class="grid grid-cols-2 gap-2.5 text-xs">
              <router-link 
                to="/guide/market-tour" 
                class="p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold transition text-center flex flex-col items-center justify-center gap-1.5 group"
              >
                <i class="fas fa-plane-departure text-lg text-amber-400 group-hover:scale-110 transition"></i>
                <span class="text-[11px]">시장투어 신청</span>
              </router-link>

              <router-link 
                to="/services/rocket-growth" 
                class="p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold transition text-center flex flex-col items-center justify-center gap-1.5 group"
              >
                <i class="fas fa-rocket text-lg text-red-400 group-hover:scale-110 transition"></i>
                <span class="text-[11px]">로켓그로스 대행</span>
              </router-link>

              <router-link 
                to="/services/purchasing-agent" 
                class="p-3 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold transition text-center flex flex-col items-center justify-center gap-1.5 group"
              >
                <i class="fas fa-cart-shopping text-lg text-blue-400 group-hover:scale-110 transition"></i>
                <span class="text-[11px]">1688 구매대행</span>
              </router-link>

              <router-link 
                to="/services/trade-agent" 
                class="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold transition text-center flex flex-col items-center justify-center gap-1.5 group"
              >
                <i class="fas fa-industry text-lg text-emerald-400 group-hover:scale-110 transition"></i>
                <span class="text-[11px]">OEM/ODM 무역</span>
              </router-link>
            </div>

            <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center">
              <span class="text-[11px] text-slate-400 block">유선 상담 및 긴급 문의</span>
              <a href="tel:010-9373-1214" class="text-sm font-black text-blue-400 hover:underline">
                010-9373-1214
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- ======================================================== -->
    <!-- ======================================================== -->
    <!-- 3. CORE SERVICES 4 CARDS (High-End Agency Cards) -->
    <!-- ======================================================== -->
    <section class="py-16 sm:py-24 bg-[#0b0f19] text-white relative border-t border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div class="text-center max-w-3xl mx-auto space-y-3">
          <span class="text-xs font-black text-blue-400 uppercase tracking-wider">EUC CORE COMPETENCY</span>
          <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
            성공적인 중국 수입을 위한 4대 핵심 서비스
          </h2>
          <p class="text-sm sm:text-base text-slate-300 leading-relaxed">
            소싱부터 통관, 검수, 직납까지 고객의 비즈니스 형태에 가장 최적화된 맞춤 물류 솔루션을 제공합니다.
          </p>
        </div>

        <!-- Single Unified Responsive Grid for Mobile (1 col), Tablet (2 col), and Desktop (4 col) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            v-for="card in serviceCards" 
            :key="card.id"
            :class="['group relative rounded-3xl overflow-hidden border border-slate-700/80 shadow-xl shadow-black/60 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1.5 flex flex-col justify-between p-6 sm:p-7 min-h-[380px] bg-[#141e33]', card.hoverBorder, card.hoverShadow]"
          >
            <!-- Background Media Layer (Video or Image or Default Navy) -->
            <video 
              v-if="card.mediaUrl && isVideoMedia(card.mediaUrl)" 
              :src="card.mediaUrl" 
              autoplay 
              loop 
              muted 
              playsinline 
              webkit-playsinline 
              x5-playsinline
              preload="auto"
              @canplay="handleVideoCanPlay"
              class="absolute inset-0 w-full h-full object-cover z-0"
            ></video>
            <img 
              v-else-if="card.mediaUrl" 
              :src="card.mediaUrl" 
              :alt="card.title" 
              class="absolute inset-0 w-full h-full object-cover z-0" 
              loading="eager"
            />
            <div v-else class="absolute inset-0 bg-[#141e33] z-0"></div>

            <!-- Dark Overlay (z-10) -->
            <div class="absolute inset-0 bg-black/60 z-10 pointer-events-none"></div>

            <!-- Content Layer (z-20) -->
            <div class="relative z-20 space-y-4">
              <div class="flex items-center justify-between">
                <div :class="['w-14 h-14 rounded-2xl border backdrop-blur-md flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300 shadow-lg', card.iconColor]">
                  <i :class="card.icon"></i>
                </div>
                <span :class="['px-2.5 py-1 rounded-full text-[11px] font-black border shadow-sm backdrop-blur-sm', card.badgeColor]">
                  {{ card.badge }}
                </span>
              </div>

              <div>
                <h3 :class="['text-xl font-black text-white transition leading-snug', card.hoverText]">
                  {{ card.title }}
                </h3>
                <p class="text-xs text-slate-200 mt-2.5 leading-relaxed font-medium">
                  {{ card.desc }}
                </p>
              </div>
            </div>

            <!-- Bottom Action Link (z-20) -->
            <div class="relative z-20 pt-6 border-t border-white/15 mt-6">
              <router-link 
                :to="card.link" 
                :class="['text-xs font-bold flex items-center justify-between transition group-hover:translate-x-1', card.hoverText]"
              >
                <span class="group-hover:text-white transition">{{ card.linkText }}</span>
                <span :class="['w-7 h-7 rounded-full border flex items-center justify-center text-xs text-white transition', card.arrowBg]">&rarr;</span>
              </router-link>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 4. SERVICE FLOW TIMELINE (01 -> 02 -> 03 -> 04) -->
    <!-- ======================================================== -->
    <section class="py-16 sm:py-24 bg-slate-900 text-white relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div class="text-center max-w-3xl mx-auto space-y-3">
          <span class="text-xs font-black text-blue-400 uppercase tracking-wider">SEAMLESS IMPORT PROCESS</span>
          <h2 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
            원클릭으로 끝나는 원스톱 수입 프로세스
          </h2>
          <p class="text-sm text-slate-400 leading-relaxed">
            복잡한 중국 현지 소싱부터 국내 입고까지, 15년 노하우 시스템으로 안전하게 처리됩니다.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          
          <!-- Step 1 -->
          <div class="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 relative group hover:border-blue-500 transition">
            <span class="text-3xl font-black text-blue-500 block">01</span>
            <h3 class="text-base font-bold text-white">견적 산출 & 상품 소싱</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              실시간 계산기로 견적 확인 후 1688 링크 또는 샘플 의뢰 접수 및 최저가 네고 진행.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 relative group hover:border-blue-500 transition">
            <span class="text-3xl font-black text-indigo-500 block">02</span>
            <h3 class="text-base font-bold text-white">현지 결제 & 정밀 검수</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              안전한 결제 대행 및 이우/웨이하이 직영 창고 입고 후 수량/불량 1차 정밀 검수.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 relative group hover:border-blue-500 transition">
            <span class="text-3xl font-black text-purple-500 block">03</span>
            <h3 class="text-base font-bold text-white">FTA C/O 발급 & 통관</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              한-중 FTA 원산지증명서 발급으로 관세 0% 감면 혜택 및 전문 관세사 신속 통관.
            </p>
          </div>

          <!-- Step 4 -->
          <div class="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-3 relative group hover:border-blue-500 transition">
            <span class="text-3xl font-black text-emerald-500 block">04</span>
            <h3 class="text-base font-bold text-white">쿠팡 직납 & 국내 배송</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              쿠팡 FC센터 밀크런 트럭 직납 또는 경동화물/자체 택배로 화주 창고까지 완벽 배송.
            </p>
          </div>

        </div>

      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 5. INTERACTIVE CALCULATOR PREVIEW WIDGET -->
    <!-- ======================================================== -->
    <section class="py-16 sm:py-24 bg-gradient-to-b from-slate-100 to-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 rounded-3xl p-8 sm:p-12 text-white shadow-2xl border border-blue-800/40">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div class="lg:col-span-5 space-y-4">
              <span class="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold rounded-full inline-block">
                INTERACTIVE ESTIMATE PREVIEW
              </span>
              <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                지금 바로 예상 수입 비용을<br />
                직접 계산해 보세요
              </h2>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                현재 적용 환율 <strong>(1 RMB = {{ customRate }}원)</strong>을 기준으로 제품 대금, 국제 운임, 관부가세를 실시간 연산합니다.
              </p>
              <div class="pt-2">
                <router-link 
                  to="/tools/calculator"
                  class="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg transition"
                >
                  <i class="fas fa-calculator"></i>
                  <span>정밀 계산기 전체 화면으로 열기 &rarr;</span>
                </router-link>
              </div>
            </div>

            <!-- Mini Interactive Calculator Card -->
            <div class="lg:col-span-7 bg-slate-950/80 p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-xl space-y-5 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <!-- RMB Input -->
                <div>
                  <label class="block text-slate-400 font-bold mb-1">제품 총액 (위안화 ¥)</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">¥</span>
                    <input 
                      v-model.number="miniRmb" 
                      type="number" 
                      step="100" 
                      class="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <!-- CBM Input -->
                <div>
                  <label class="block text-slate-400 font-bold mb-1">화물 부피 (CBM)</label>
                  <input 
                    v-model.number="miniCbm" 
                    type="number" 
                    step="0.1" 
                    min="0.1"
                    class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Shipping Mode -->
                <div>
                  <label class="block text-slate-400 font-bold mb-1">운송 방식</label>
                  <select 
                    v-model="miniShipping" 
                    class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold outline-none focus:border-blue-500"
                  >
                    <option value="sea_lcl">해운 LCL 콘솔</option>
                    <option value="sea_express">전자상 해운특송</option>
                    <option value="air_express">항공 특송</option>
                    <option value="other_customs">기타통관 (1:1 맞춤)</option>
                  </select>
                </div>

              </div>

              <!-- Quick Results Breakdown -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800 text-[11px]">
                <div class="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span class="text-slate-500 block">순수 제품가</span>
                  <span class="font-bold text-slate-200">{{ miniProductKrw.toLocaleString() }}원</span>
                </div>
                <div class="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span class="text-slate-500 block">예상 국제운임</span>
                  <span v-if="miniShipping === 'other_customs'" class="font-bold text-amber-300 text-[10px]">1:1 맞춤 산출</span>
                  <span v-else class="font-bold text-sky-300">{{ miniFreightKrw.toLocaleString() }}원</span>
                </div>
                <div class="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                  <span class="text-slate-500 block">관세+부가세(10%)</span>
                  <span class="font-bold text-slate-200">{{ miniTaxKrw.toLocaleString() }}원</span>
                </div>
                <div class="p-2.5 bg-blue-950/60 rounded-xl border border-blue-800/80">
                  <span class="text-amber-300 block font-bold">총 예상 견적</span>
                  <span v-if="miniShipping === 'other_customs'" class="font-black text-yellow-400 text-xs">상담 후 확정</span>
                  <span v-else class="font-black text-yellow-400 text-xs sm:text-sm">{{ miniTotalKrw.toLocaleString() }}원</span>
                </div>
              </div>

              <!-- Other customs notice -->
              <div v-if="miniShipping === 'other_customs'" class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                <i class="fas fa-info-circle text-amber-400 shrink-0"></i>
                <span>특수/기타 통관 품목은 전담 매니저의 1:1 상담 후 맞춤 견적이 산출됩니다.</span>
              </div>

              <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>※ 한-중 FTA C/O 적용 및 수수료 포함 예상 산출액</span>
                <router-link 
                  :to="{ path: '/tools/calculator' }" 
                  class="text-blue-400 hover:underline font-bold"
                >
                  상세 견적서 보기 &rarr;
                </router-link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 6. PHOTO GALLERY SHOWCASE -->
    <!-- ======================================================== -->
    <TradePhotos />

    <!-- ======================================================== -->
    <!-- 7. FINAL CTA BANNER -->
    <!-- ======================================================== -->
    <section class="py-16 sm:py-20 bg-slate-950 text-white relative overflow-hidden border-t border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
        <span class="px-3.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold rounded-full inline-block">
          READY TO START SOURCING?
        </span>
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
          중국 소싱 및 수입의 모든 것,<br />
          15년 베테랑 전문가와 지금 상담하세요.
        </h2>
        <p class="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
          초보 셀러부터 대형 브랜드 화주까지, 최적의 운임과 정확한 통관으로 든든한 파트너가 되어 드립니다.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
          <a 
            href="http://pf.kakao.com/_xmQWsK/chat" 
            target="_blank"
            class="px-8 py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-sm shadow-xl hover:-translate-y-0.5 active:scale-95 transition flex items-center gap-2"
          >
            <i class="fas fa-comment text-lg"></i>
            <span>카카오톡 1:1 상담 채널</span>
          </a>

          <a 
            href="tel:010-9373-1214"
            class="px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-sm shadow-xl hover:-translate-y-0.5 active:scale-95 transition flex items-center gap-2"
          >
            <i class="fas fa-phone-alt text-emerald-400"></i>
            <span>대표전화 010-9373-1214</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Notice Modal for Bento Feed -->
    <div v-if="selectedNotice" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" @click.self="selectedNotice = null">
      <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl relative text-gray-900 text-xs">
        <div class="flex items-center justify-between border-b pb-3">
          <div>
            <span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-bold rounded">
              {{ selectedNotice.badge || selectedNotice.category_name || '공지' }}
            </span>
            <span class="text-gray-400 ml-2 text-[11px]">{{ formatDate(selectedNotice.created_at) }}</span>
          </div>
          <button @click="selectedNotice = null" class="text-gray-400 hover:text-gray-600 p-1">
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>
        <h3 class="text-base sm:text-lg font-black text-gray-900 leading-snug">
          {{ selectedNotice.title }}
        </h3>
        <p class="text-gray-600 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
          {{ selectedNotice.content || selectedNotice.summary || selectedNotice.desc }}
        </p>
        <div class="flex justify-end pt-3 border-t">
          <button @click="selectedNotice = null" class="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs">
            닫기
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import TradePhotos from '../components/TradePhotos.vue'
import { fetchSiteSettings, currentSettings, isVideoMedia } from '../lib/settings'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const router = useRouter()

// ----------------------------------------------------
// 1688 Real-Time Search Bar State & Action
// ----------------------------------------------------
const mainSearchQuery = ref('')
const popularSearchTags = [
  '블라우스',
  '실내화',
  '셔츠',
  '숄더백',
  '텀블러',
  '캠핑의자',
  '보조배터리',
  '스마트워치스트랩'
]

const handleMain1688Search = (keyword) => {
  const rawInput = (keyword || mainSearchQuery.value || '').trim()
  if (!rawInput) {
    router.push('/mall')
    return
  }

  const urlMatch = rawInput.match(/offer\/(\d+)\.html/) || rawInput.match(/[?&]offerId=(\d+)/) || rawInput.match(/[?&]itemId=(\d+)/)
  const isNumericId = /^\d{9,16}$/.test(rawInput)
  const offerId = urlMatch ? urlMatch[1] : (isNumericId ? rawInput : null)

  if (offerId) {
    router.push({ path: '/mall', query: { offerId } })
  } else {
    router.push({ path: '/mall', query: { q: rawInput } })
  }
}

// ----------------------------------------------------
// 4 Core Service Cards Dynamic Media Bindings (service_media JSONB Direct Supabase Binding)
// ----------------------------------------------------
const serviceMediaCard1 = computed(() => currentSettings.value?.service_media?.card1 || currentSettings.value?.service_card_media_rocket || '')
const serviceMediaCard2 = computed(() => currentSettings.value?.service_media?.card2 || currentSettings.value?.service_card_media_purchasing || '')
const serviceMediaCard3 = computed(() => currentSettings.value?.service_media?.card3 || currentSettings.value?.service_card_media_trade || '')
const serviceMediaCard4 = computed(() => currentSettings.value?.service_media?.card4 || currentSettings.value?.service_card_media_tour || '')

const serviceCards = computed(() => [
  {
    id: 'rocket',
    title: '쿠팡 로켓그로스 & 밀크런 입고 대행',
    badge: '쿠팡 공식 규격 준수',
    badgeColor: 'bg-red-500/80 text-white border-red-300/40',
    icon: 'fas fa-rocket',
    iconColor: 'bg-red-500/20 border-red-400/40 text-red-400',
    hoverBorder: 'hover:border-red-500/80',
    hoverShadow: 'hover:shadow-red-500/20',
    hoverText: 'group-hover:text-red-300',
    arrowBg: 'bg-red-500/30 border-red-400/50 group-hover:bg-red-500',
    desc: '바코드 라벨 부착, KC인증 라벨 작업, 파레트 래핑 및 규격 포장부터 지정 FC센터 밀크런 트럭 직납까지 원스톱 대행.',
    link: '/services/rocket-growth',
    linkText: '상세 안내 및 신청하기',
    mediaUrl: serviceMediaCard1.value
  },
  {
    id: 'purchasing',
    title: '1688 / 타오바오 중국 구매대행',
    badge: '수수료 8% / 최저가 보장',
    badgeColor: 'bg-blue-600/80 text-white border-blue-300/40',
    icon: 'fas fa-cart-shopping',
    iconColor: 'bg-blue-500/20 border-blue-400/40 text-blue-400',
    hoverBorder: 'hover:border-blue-400/80',
    hoverShadow: 'hover:shadow-blue-500/20',
    hoverText: 'group-hover:text-blue-300',
    arrowBg: 'bg-blue-500/30 border-blue-400/50 group-hover:bg-blue-600',
    desc: '알리페이 수수료 절감, 현지 창고 도착 즉시 1차 정밀 검품, 해운/항공 특송 출고 및 통관 서류 완벽 지원.',
    link: '/services/purchasing-agent',
    linkText: '주문서 작성 바로가기',
    mediaUrl: serviceMediaCard2.value
  },
  {
    id: 'trade',
    title: '무역대행 & OEM/ODM 맞춤제조',
    badge: '현지 공장 다이렉트 소싱',
    badgeColor: 'bg-emerald-600/80 text-white border-emerald-300/40',
    icon: 'fas fa-industry',
    iconColor: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400',
    hoverBorder: 'hover:border-emerald-400/80',
    hoverShadow: 'hover:shadow-emerald-500/20',
    hoverText: 'group-hover:text-emerald-300',
    arrowBg: 'bg-emerald-500/30 border-emerald-400/50 group-hover:bg-emerald-600',
    desc: '현지 공장 실사, 단가 네고, 금형 제작 및 샘플 감리, 포워딩 & 통관 서류 일체 대행으로 브랜드 제품 런칭 지원.',
    link: '/services/trade-agent',
    linkText: '맞춤 무역 의뢰하기',
    mediaUrl: serviceMediaCard3.value
  },
  {
    id: 'tour',
    title: '중국 이우(푸텐) 시장조사 투어',
    badge: '전담 통역 & 픽업 풀패키지',
    badgeColor: 'bg-amber-500/80 text-white border-amber-300/40',
    icon: 'fas fa-plane-departure',
    iconColor: 'bg-amber-500/20 border-amber-400/40 text-amber-400',
    hoverBorder: 'hover:border-amber-400/80',
    hoverShadow: 'hover:shadow-amber-500/20',
    hoverText: 'group-hover:text-amber-300',
    arrowBg: 'bg-amber-500/30 border-amber-400/50 group-hover:bg-amber-500',
    desc: '세계 최대 도매시장 푸텐시장 1~5기 구역별 맞춤 가이드, 비즈니스 전담 통역, 호텔/공항 픽업 및 발주 연계.',
    link: '/guide/market-tour',
    linkText: '투어 일정 & 견적 확인',
    mediaUrl: serviceMediaCard4.value
  }
])

const handleVideoCanPlay = (e) => {
  const v = e?.target
  if (v) {
    v.muted = true
    v.defaultMuted = true
    const p = v.play()
    if (p !== undefined) {
      p.catch(() => {})
    }
  }
}

// ----------------------------------------------------
// Real-Time Rates & Settings & Hero Media
// ----------------------------------------------------
const liveRate = ref(null)
const customRate = ref('230')
const rateMode = ref('manual')
const rateMargin = ref(1.5)
const agencyFeeRate = ref(8)
const seaCbmRate = ref(98000)
const customsClearanceFee = ref(33000)
const ftaCoFee = ref(33000)
const isVideoLoaded = ref(false)
const selectedNotice = ref(null)

// Hero Media State & Reactive Bindings
const heroVideoRef = ref(null)
const heroMediaType = computed(() => currentSettings.value?.hero_media_type || 'video_mp4')
const heroMediaUrl = computed(() => {
  let mediaUrl = currentSettings.value?.hero_media_url || ''
  if (!mediaUrl || mediaUrl.includes('assets.mixkit.co')) {
    mediaUrl = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/7/7a/Container_Ship_Dashcam_Around_The_World_In_70_Days_Timelapse%2C_4k%2C_60fps.webm/Container_Ship_Dashcam_Around_The_World_In_70_Days_Timelapse%2C_4k%2C_60fps.webm.480p.vp9.webm'
  }
  return mediaUrl
})
const heroOverlayOpacity = computed(() => {
  const op = currentSettings.value?.hero_overlay_opacity
  return op !== undefined && !isNaN(Number(op)) ? Number(op) : 60
})

const heroYoutubeEmbedUrl = computed(() => {
  if (!heroMediaUrl.value) return ''
  let videoId = ''
  if (heroMediaUrl.value.includes('youtube.com/watch?v=')) {
    videoId = heroMediaUrl.value.split('v=')[1]?.split('&')[0]
  } else if (heroMediaUrl.value.includes('youtu.be/')) {
    videoId = heroMediaUrl.value.split('youtu.be/')[1]?.split('?')[0]
  } else if (heroMediaUrl.value.includes('youtube.com/embed/')) {
    return heroMediaUrl.value
  } else {
    videoId = heroMediaUrl.value
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1`
})

// ----------------------------------------------------
// Notices Feed State (Single Source of Truth: euchs_admin_notices)
// ----------------------------------------------------
const DEFAULT_HOME_NOTICES = [
  {
    id: 'notice-1',
    category: 'system',
    category_name: '업무일정',
    badge: '긴급점검',
    is_pinned: true,
    is_important: true,
    title: 'EUCHS 차세대 B2B 수입대행 ERP 시스템 정기 데이터베이스 점검 안내',
    summary: '실시간 1688 API 주문 및 화물 트래킹 연동 안정화를 위한 서버 점검',
    thumbnail_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    content: '안녕하세요, 이유씨컴퍼니입니다.\n\n보다 안정적인 1688 실시간 상품 연동 및 화물 위치 추적 서비스를 제공하기 위해 정기 서버 및 데이터베이스 최적화 작업을 진행합니다.\n\n- 작업 일시: 2026년 8월 26일 (수) 새벽 02:00 ~ 04:00 (약 2시간)\n- 영향 범위: 작업 시간 중 일시적인 주문서 작성 지연이 발생할 수 있습니다.\n\n바이어 여러분의 너른 양해 부탁드립니다.',
    created_at: '2026-08-25T09:00:00.000Z'
  },
  {
    id: 'notice-2',
    category: 'schedule',
    category_name: '이벤트',
    badge: '모집중',
    is_pinned: true,
    is_important: true,
    title: '제43기 중국 이우(푸텐) 도매시장 사입 조사단 참가 바이어 모집',
    summary: '전담 통역 및 1:1 공장 섭외 포함 4박 5일 풀패키지 투어 선착순 모집',
    thumbnail_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    content: '중국 이우 푸텐시장 1~5구 전 구역을 전담 매니저와 함께 동행하는 43기 이우 시장조사 투어 접수가 시작되었습니다.\n\n- 일정: 2026년 9월 16일 ~ 9월 20일 (4박 5일)\n- 모집 인원: 선착순 12명 (잔여 5석)\n- 혜택: 전담 통역, 픽업, 호텔, 공장 섭외 풀패키지 지원',
    created_at: '2026-08-23T14:30:00.000Z'
  },
  {
    id: 'notice-3',
    category: 'customs',
    category_name: '통관·물류',
    badge: '통관',
    is_pinned: false,
    is_important: false,
    title: '한-중 FTA 원산지증명서(C/O) 발급 및 관세 감면 실무 가이드',
    summary: '정식 수입신고 시 FTA 협정관세 0~4% 감면 적용 절차 안내',
    thumbnail_url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80',
    content: '중국 수입 시 한-중 FTA 협정관세를 적용받기 위한 원산지증명서(C/O) 발급 절차 및 서류 안내입니다.\n\n당사 창고에서 출고 전 발급 대행을 원스톱으로 지원해 드립니다.',
    created_at: '2026-08-20T09:15:00.000Z'
  }
]

const noticesList = ref([])

const sortNotices = (list) => {
  if (!Array.isArray(list)) return []
  return [...list].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
  })
}

const fetchNoticesFeed = async () => {
  let loaded = null

  // 1. localStorage euchs_admin_notices (단일 참조 키) 우선 로드
  try {
    const raw = localStorage.getItem('euchs_admin_notices') || localStorage.getItem('euchs_notices')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        loaded = parsed
      }
    }
  } catch (e) {
    console.warn('Failed to parse notices from storage:', e)
  }

  // 2. 비어있거나 없는 경우 기본 3대 공지 데이터 로드 & 스토리지 동기화
  if (!loaded || loaded.length === 0) {
    loaded = JSON.parse(JSON.stringify(DEFAULT_HOME_NOTICES))
    try {
      localStorage.setItem('euchs_admin_notices', JSON.stringify(loaded))
      localStorage.setItem('euchs_notices', JSON.stringify(loaded))
    } catch (e) {}
  }

  noticesList.value = sortNotices(loaded)

  // 3. Supabase DB 비동기 fetch 및 병합
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .neq('category', 'system_config')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data && data.length > 0) {
        noticesList.value = sortNotices(data)
        try {
          localStorage.setItem('euchs_admin_notices', JSON.stringify(data))
          localStorage.setItem('euchs_notices', JSON.stringify(data))
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn('Fetch notices feed fallback:', err)
  }
}

const fetchLiveRateAndSettings = async () => {
  let liveNum = 230.0
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY')
    if (res.ok) {
      const data = await res.json()
      if (data?.rates?.KRW) {
        liveNum = Number(data.rates.KRW.toFixed(2))
        liveRate.value = liveNum.toFixed(2)
      }
    }
  } catch (err) {
    console.warn('Live rate API fetch fallback:', err)
    liveRate.value = '230.00'
  }

  try {
    const settings = await fetchSiteSettings()
    if (settings) {
      rateMode.value = settings.exchange_rate_mode || 'manual'
      rateMargin.value = Number(settings.rate_margin) || 1.5
      agencyFeeRate.value = Number(settings.agency_fee_rate) || 8
      seaCbmRate.value = Number(settings.sea_cbm_rate) || 98000
      customsClearanceFee.value = Number(settings.customs_clearance_fee) || 33000
      ftaCoFee.value = Number(settings.fta_co_fee) || 33000

      if (rateMode.value === 'auto_margin' || rateMode.value === 'auto') {
        const calculated = Number((liveNum + rateMargin.value).toFixed(2))
        customRate.value = String(calculated)
      } else {
        const fixed = Number(settings.exchange_rate) || 230
        customRate.value = String(fixed)
      }
      setTimeout(attemptAutoplayVideos, 50)
    }
  } catch (e) {
    console.warn('Settings load fallback:', e)
  }
}

const openNoticeModal = (item) => {
  selectedNotice.value = item
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}

// ----------------------------------------------------
// Mini Interactive Calculator State
// ----------------------------------------------------
const miniRmb = ref(5000)
const miniCbm = ref(1.0)
const miniShipping = ref('sea_lcl')

const currentRateNum = computed(() => Number(customRate.value) || 230)

const miniProductKrw = computed(() => {
  return Math.round((Number(miniRmb.value) || 0) * currentRateNum.value)
})

const miniFreightKrw = computed(() => {
  if (miniShipping.value === 'other_customs') {
    return 0
  } else if (miniShipping.value === 'sea_lcl') {
    return Math.round(Math.max(Number(miniCbm.value) || 1, 1) * seaCbmRate.value)
  } else if (miniShipping.value === 'sea_express') {
    return Math.round(5000 + (Math.ceil(Math.max(Number(miniCbm.value) * 167 - 1, 0) / 0.5) * 800))
  } else {
    return Math.round(Math.max(Number(miniCbm.value) * 167, 1) * 6500)
  }
})

const miniTaxKrw = computed(() => {
  const cif = miniProductKrw.value + miniFreightKrw.value
  const vat = Math.round(cif * 0.1)
  return vat
})

const miniTotalKrw = computed(() => {
  const fee = Math.max(Math.round(miniProductKrw.value * (agencyFeeRate.value / 100)), 10000)
  return miniProductKrw.value + fee + miniFreightKrw.value + miniTaxKrw.value + customsClearanceFee.value
})

// ----------------------------------------------------
// Mobile Video Autoplay Guarantee & Exception Handler
// ----------------------------------------------------
const attemptAutoplayVideos = () => {
  if (typeof document === 'undefined') return
  const videoElements = document.querySelectorAll('video')
  videoElements.forEach((video) => {
    video.muted = true
    video.playsInline = true
    video.setAttribute('muted', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.setAttribute('x5-playsinline', '')

    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Mobile policy might restrict background autoplay before user touch
        console.warn('Initial mobile autoplay prevented/deferred:', err?.message || err)
      })
    }
  })
}

let userInteractionListenerRegistered = false
const enableVideoOnFirstTouch = () => {
  attemptAutoplayVideos()
  if (userInteractionListenerRegistered && typeof window !== 'undefined') {
    window.removeEventListener('touchstart', enableVideoOnFirstTouch)
    window.removeEventListener('click', enableVideoOnFirstTouch)
    window.removeEventListener('scroll', enableVideoOnFirstTouch)
    userInteractionListenerRegistered = false
  }
}

// Real-time Settings Sync Handler
const handleSettingsSync = (e) => {
  if (e?.detail) {
    currentSettings.value = { ...currentSettings.value, ...e.detail }
  } else {
    fetchLiveRateAndSettings()
  }
  setTimeout(attemptAutoplayVideos, 50)
}

// Visibility change sync
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchLiveRateAndSettings()
    fetchNoticesFeed()
    setTimeout(attemptAutoplayVideos, 100)
  }
}

onMounted(() => {
  fetchLiveRateAndSettings()
  fetchNoticesFeed()

  // Video Autoplay Guarantee for mobile browsers (iOS Safari / Android Chrome / Webviews)
  setTimeout(attemptAutoplayVideos, 50)
  setTimeout(attemptAutoplayVideos, 300)
  setTimeout(attemptAutoplayVideos, 1000)

  if (typeof window !== 'undefined') {
    window.addEventListener('touchstart', enableVideoOnFirstTouch, { passive: true, once: true })
    window.addEventListener('click', enableVideoOnFirstTouch, { passive: true, once: true })
    window.addEventListener('scroll', enableVideoOnFirstTouch, { passive: true, once: true })
    window.addEventListener('euchs-settings-updated', handleSettingsSync)
    window.addEventListener('euchs-notice-update', fetchNoticesFeed)
    window.addEventListener('storage', fetchNoticesFeed)
    userInteractionListenerRegistered = true
  }

  const intervalId = setInterval(fetchLiveRateAndSettings, 10 * 60 * 1000)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', fetchLiveRateAndSettings)

  onUnmounted(() => {
    clearInterval(intervalId)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', fetchLiveRateAndSettings)
    if (typeof window !== 'undefined') {
      window.removeEventListener('euchs-settings-updated', handleSettingsSync)
      window.removeEventListener('euchs-notice-update', fetchNoticesFeed)
      window.removeEventListener('storage', fetchNoticesFeed)
    }
    if (userInteractionListenerRegistered && typeof window !== 'undefined') {
      window.removeEventListener('touchstart', enableVideoOnFirstTouch)
      window.removeEventListener('click', enableVideoOnFirstTouch)
      window.removeEventListener('scroll', enableVideoOnFirstTouch)
    }
  })
})
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
