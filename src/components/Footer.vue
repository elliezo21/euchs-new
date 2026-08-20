<template>
  <footer class="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 relative z-10 pb-28 sm:pb-12">
    
    <!-- Top Policy & Navigation Bar -->
    <div class="border-b border-slate-800/80 py-4 sm:py-3 bg-slate-900/80">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <!-- Mobile: Clean 3-Column Grid / Desktop: Horizontal Flex Bar -->
        <nav aria-label="푸터 빠른 링크" class="w-full md:w-auto">
          <div class="grid grid-cols-3 gap-2 text-center md:flex md:flex-wrap md:items-center md:justify-start md:gap-x-5 md:gap-y-1 text-xs">
            
            <button 
              type="button" 
              @click="showPolicy('privacy')" 
              class="px-2 py-2 md:p-0 rounded-xl bg-slate-900/90 md:bg-transparent border border-slate-800/90 md:border-none text-slate-300 hover:text-white hover:underline text-center transition whitespace-nowrap break-keep text-[11px] sm:text-xs"
            >
              개인정보처리방침
            </button>

            <button 
              type="button" 
              @click="showPolicy('terms')" 
              class="px-2 py-2 md:p-0 rounded-xl bg-slate-900/90 md:bg-transparent border border-slate-800/90 md:border-none text-slate-300 hover:text-white hover:underline text-center transition whitespace-nowrap break-keep text-[11px] sm:text-xs"
            >
              이용약관
            </button>

            <router-link 
              to="/community/notice" 
              class="px-2 py-2 md:p-0 rounded-xl bg-slate-900/90 md:bg-transparent border border-slate-800/90 md:border-none text-slate-300 hover:text-white hover:underline text-center transition whitespace-nowrap break-keep text-[11px] sm:text-xs block"
            >
              공지사항
            </router-link>

            <router-link 
              to="/community/faq" 
              class="px-2 py-2 md:p-0 rounded-xl bg-slate-900/90 md:bg-transparent border border-slate-800/90 md:border-none text-slate-300 hover:text-white hover:underline text-center transition whitespace-nowrap break-keep text-[11px] sm:text-xs block"
            >
              자주하는질문
            </router-link>

            <router-link 
              to="/guide" 
              class="px-2 py-2 md:p-0 rounded-xl bg-slate-900/90 md:bg-transparent border border-slate-800/90 md:border-none text-slate-300 hover:text-white hover:underline text-center transition whitespace-nowrap break-keep text-[11px] sm:text-xs block"
            >
              배송요금표
            </router-link>

            <router-link 
              to="/tools/calculator" 
              class="px-2 py-2 md:p-0 rounded-xl bg-blue-950/50 md:bg-transparent border border-blue-800/50 md:border-none text-blue-400 hover:text-blue-300 font-bold text-center transition whitespace-nowrap break-keep text-[11px] sm:text-xs block"
            >
              무역/관부가세계산기
            </router-link>

            <router-link 
              to="/admin" 
              class="px-2 py-2 md:p-0 rounded-xl bg-slate-900/90 md:bg-transparent border border-slate-800/90 md:border-none text-slate-500 hover:text-blue-400 text-center transition flex items-center justify-center gap-1 col-span-3 md:col-span-1 text-[11px] sm:text-xs"
            >
              <i class="fas fa-lock text-[10px]"></i>
              <span>관리자</span>
            </router-link>

          </div>
        </nav>

        <div class="text-slate-500 text-[11px] text-center md:text-right shrink-0 mt-1 md:mt-0">
          15년 노하우 신뢰의 중국 무역 파트너 <strong>EUC COMPANY</strong>
        </div>

      </div>
    </div>

    <!-- Main Footer Info -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Left: Company Details (8 cols) -->
        <div class="lg:col-span-8 space-y-3.5">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-white font-black text-base sm:text-lg tracking-wide">이유씨컴퍼니</span>
            <span class="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 text-[11px] font-semibold border border-blue-800/60">
              중국무역 · 구매대행 · OEM/ODM 제조전문
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-slate-300 leading-relaxed text-xs">
            <p><strong>대표:</strong> 조해성</p>
            <p><strong>사업자등록번호:</strong> 783-17-01247</p>
            <p><strong>통신판매업신고번호:</strong> 제2019-광주동구-0277호</p>
            <p><strong>이메일:</strong> koreaeuchs@126.com</p>
            <p class="sm:col-span-2">
              <strong>한국 주소:</strong> 광주광역시 북구 서방로135번길 54, 1층
            </p>
            <p class="sm:col-span-2">
              <strong>중국 본사:</strong> No. 2, building 62, Qiancheng community, Yiwu, China
            </p>
            <p><strong>한국 연락처:</strong> <a href="tel:010-9373-1214" class="hover:text-white">010-9373-1214</a></p>
            <p><strong>중국 직통:</strong> <a href="tel:010-6703-6750" class="hover:text-white">010-6703-6750</a></p>
          </div>

          <div class="pt-3 text-slate-500 text-[11px] border-t border-slate-900">
            Copyright &copy; 2022 <strong>(주)이유씨컴퍼니</strong> All Rights Reserved.
          </div>
        </div>

        <!-- Right: CS Hotline & Logo (4 cols) -->
        <div class="lg:col-span-4 bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div class="flex items-center justify-between">
            <img 
              src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/logo.png" 
              alt="EUC 로고" 
              class="h-8 w-auto brightness-0 invert opacity-80"
            />
            <span class="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> 실시간 상담 대기
            </span>
          </div>

          <div>
            <p class="text-xs text-slate-400 font-bold">고객센터 & 1:1 수입 상담</p>
            <a 
              href="tel:010-9373-1214" 
              class="text-2xl sm:text-3xl font-black text-white hover:text-blue-400 transition tracking-tight mt-0.5 inline-block"
            >
              010-9373-1214
            </a>
            <p class="text-[11px] text-slate-400 mt-1">
              평일 / 주말 / 공휴일 24시간 실시간 친절 상담
            </p>
          </div>

          <div class="pt-1 flex gap-2">
            <a 
              href="http://pf.kakao.com/_xmQWsK/chat" 
              target="_blank"
              class="flex-1 py-2.5 px-3 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black rounded-xl text-center text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
            >
              <i class="fas fa-comment text-sm text-amber-950"></i>
              <span>카톡 1:1 상담</span>
            </a>
            <a 
              href="https://www.youtube.com/@euccompany" 
              target="_blank"
              class="py-2.5 px-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-center text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              title="이유씨 유튜브 채널"
            >
              <i class="fab fa-youtube text-base"></i>
            </a>
          </div>
        </div>

      </div>
    </div>
  </footer>
</template>

<script setup>
const showPolicy = (type) => {
  if (type === 'privacy') {
    alert('[개인정보처리방침]\n이유씨컴퍼니는 고객님의 소중한 개인정보를 안전하게 보호하며 관련 법령을 철저히 준수합니다.')
  } else {
    alert('[이용약관]\n이유씨컴퍼니의 무역대행 및 구매대행 서비스 이용약관 안내입니다.')
  }
}
</script>
