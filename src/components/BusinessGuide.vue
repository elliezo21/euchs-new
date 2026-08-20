<template>
  <section class="py-16 sm:py-20 bg-white border-y border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Title -->
      <div class="text-center max-w-3xl mx-auto mb-12">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          EUC에 언제든지 문의주시면 실시간으로 회신드립니다.
        </h2>
        <p class="mt-2 text-sm sm:text-base text-gray-500 font-medium italic">
          If you ask me anytime, I'll reply in real time.
        </p>
        <div class="mt-3 w-10 h-1 bg-blue-500 mx-auto rounded-full"></div>
      </div>

      <!-- 4 Quick Banners Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <!-- Box 1 -->
        <router-link 
          to="/guide#express"
          class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              <i class="fas fa-truck-fast"></i>
            </div>
            <i class="fas fa-arrow-right text-white/60 group-hover:text-white group-hover:translate-x-1 transition"></i>
          </div>
          <div class="mt-6">
            <span class="text-xs text-blue-200 font-semibold tracking-wider uppercase">Guide 01</span>
            <h3 class="text-lg font-bold text-white mt-1 group-hover:text-yellow-300 transition">
              택배 배송 요금표 안내
            </h3>
            <p class="text-xs text-blue-100/80 mt-1">1일 특송 & 전자상 해운 요율표</p>
          </div>
        </router-link>

        <!-- Box 2 -->
        <router-link 
          to="/guide#sea"
          class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-600 to-blue-800 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              <i class="fas fa-ship"></i>
            </div>
            <i class="fas fa-arrow-right text-white/60 group-hover:text-white group-hover:translate-x-1 transition"></i>
          </div>
          <div class="mt-6">
            <span class="text-xs text-sky-200 font-semibold tracking-wider uppercase">Guide 02</span>
            <h3 class="text-lg font-bold text-white mt-1 group-hover:text-yellow-300 transition">
              해운물류 이용안내
            </h3>
            <p class="text-xs text-sky-100/80 mt-1">해운 컨테이너 / LCL / FCL 물류</p>
          </div>
        </router-link>

        <!-- Box 3 -->
        <router-link 
          to="/guide#forwarding"
          class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-600 to-emerald-800 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              <i class="fas fa-file-invoice-dollar"></i>
            </div>
            <i class="fas fa-arrow-right text-white/60 group-hover:text-white group-hover:translate-x-1 transition"></i>
          </div>
          <div class="mt-6">
            <span class="text-xs text-teal-200 font-semibold tracking-wider uppercase">Guide 03</span>
            <h3 class="text-lg font-bold text-white mt-1 group-hover:text-yellow-300 transition">
              포워딩 및 수수료 안내
            </h3>
            <p class="text-xs text-teal-100/80 mt-1">B/L 발행, 통관 보장 및 수수료율</p>
          </div>
        </router-link>

        <!-- Box 4 -->
        <router-link 
          to="/guide#refund"
          class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-2xl group-hover:scale-110 transition">
              <i class="fas fa-rotate-left"></i>
            </div>
            <i class="fas fa-arrow-right text-white/60 group-hover:text-white group-hover:translate-x-1 transition"></i>
          </div>
          <div class="mt-6">
            <span class="text-xs text-purple-200 font-semibold tracking-wider uppercase">Guide 04</span>
            <h3 class="text-lg font-bold text-white mt-1 group-hover:text-yellow-300 transition">
              반품 및 교환 안내
            </h3>
            <p class="text-xs text-purple-100/80 mt-1">불량 처리, 파손 보상 및 검수 규정</p>
          </div>
        </router-link>

      </div>
    </div>
  </section>
</template>
