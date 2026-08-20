<template>
  <div class="bg-white">
    <!-- Sub Header Hero Banner -->
    <div class="relative bg-slate-900 py-14 sm:py-20 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <span class="text-xs sm:text-sm font-bold tracking-widest text-blue-400 uppercase mb-2 inline-block">
          About EUC COMPANY
        </span>
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
          회사소개
        </h1>
        <p class="mt-3 text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
          15년의 중국 현지 노하우와 신뢰를 바탕으로 고객 성공의 든든한 동반자가 되겠습니다.
        </p>

        <!-- Breadcrumb -->
        <div class="mt-6 flex justify-center items-center gap-2 text-xs text-slate-400">
          <router-link to="/" class="hover:text-white flex items-center gap-1">
            <i class="fas fa-home"></i> 홈
          </router-link>
          <span>&gt;</span>
          <span class="text-blue-400 font-semibold">회사소개</span>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-20">
      
      <!-- Section 1: CEO 인사말 -->
      <section id="ceo" class="scroll-mt-24">
        <div class="text-center max-w-3xl mx-auto mb-12">
          <h2 class="text-xs sm:text-sm font-bold tracking-widest text-blue-600 uppercase mb-1">CEO Message</h2>
          <h3 class="text-2xl sm:text-3xl font-extrabold text-gray-900">
            <span class="text-blue-600">CEO</span> 인사말
          </h3>
          <p class="mt-2 text-sm sm:text-base text-gray-600">
            이유씨컴퍼니 고객님의 미래를 발하는 글로벌 강소기업으로 "최고"의 만족을 드리겠습니다.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center bg-slate-50 rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm">
          <!-- Image -->
          <div class="lg:col-span-5 relative rounded-2xl overflow-hidden shadow-lg aspect-4/3 lg:aspect-auto lg:h-full min-h-[320px] bg-slate-200">
            <img 
              src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/ceo.jpg" 
              alt="이유씨컴퍼니 대표" 
              class="w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
              <div class="text-white">
                <p class="text-xs font-semibold text-blue-300">Global Trade Partner</p>
                <p class="text-lg font-bold">EUC COMPANY</p>
              </div>
            </div>
          </div>

          <!-- Message Body -->
          <div class="lg:col-span-7 space-y-5">
            <div class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-md">
              대표인사말
            </div>
            
            <h4 class="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
              당신의 <span class="text-blue-600">새로운 미래, 이유씨컴퍼니</span>가 만들어 가겠습니다.
            </h4>

            <div class="space-y-3 text-sm sm:text-base text-gray-700 leading-relaxed">
              <p class="font-medium text-gray-800">
                함께 성장하고 서로 신뢰하는 행복한 기업문화를 꿈꾸는 이유씨컴퍼니！
              </p>
              <p>
                이유씨컴퍼니는 국경 없는 글로벌 경쟁 사회에서 변화와 혁신을 통해 더욱 강력한 글로벌 경쟁력을 갖추어 고객님의 만족을 위해 노력할 것입니다.
              </p>
              <p>
                세계 무대에서 빛을 발하는 글로벌 강소기업으로서의 입지를 확고히 다지고 있는 작은 거인, 이유씨컴퍼니! 체계적인 시스템과 혁신적인 서비스로 고객 여러분의 더욱 편리한 비즈니스를 위해 최선을 다하여 ‘최고’의 만족을 드리겠습니다.
              </p>
            </div>

            <!-- Signatures -->
            <div class="pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <div class="flex items-center gap-6">
                <div>
                  <span class="text-xs text-gray-500 block">대표이사</span>
                  <span class="text-base font-bold text-gray-900">이장춘</span>
                </div>
                <div class="w-px h-8 bg-gray-300"></div>
                <div>
                  <span class="text-xs text-gray-500 block">한국본부장</span>
                  <span class="text-base font-bold text-gray-900">조해성</span>
                </div>
              </div>
              <a 
                href="http://pf.kakao.com/_xmQWsK/chat" 
                target="_blank"
                class="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-xs sm:text-sm rounded-lg transition shadow-sm"
              >
                <i class="fas fa-comment"></i>
                <span>실시간 상담 연결</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2: 연혁 및 비전 -->
      <section id="history" class="scroll-mt-24">
        <div class="text-center max-w-3xl mx-auto mb-12">
          <h2 class="text-xs sm:text-sm font-bold tracking-widest text-blue-600 uppercase mb-1">History & Vision</h2>
          <h3 class="text-2xl sm:text-3xl font-extrabold text-gray-900">
            연혁 및 비전
          </h3>
          <p class="mt-2 text-sm sm:text-base text-gray-600">
            2000년 창립 이래 20여 년간 한중 무역의 선두에서 고객과 함께 성장해 왔습니다.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- 연혁 타임라인 카드 -->
          <div class="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
            <h4 class="text-lg font-bold text-gray-900 flex items-center gap-2">
              <i class="fas fa-clock-rotate-left text-blue-600"></i>
              <span>주요 연혁 (History)</span>
            </h4>
            <div class="relative pl-6 border-l-2 border-blue-200 space-y-6">
              <div class="relative">
                <span class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow"></span>
                <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">2022 ~ 현재</span>
                <h5 class="text-sm font-bold text-gray-900 mt-1">EUC COMPANY 법인 전환 및 이커머스 풀필먼트(3PL) 확장</h5>
                <p class="text-xs text-gray-600 mt-0.5">쿠팡 로켓그로스 납품 대행 및 스마트 실시간 물류 관제 시스템 도입</p>
              </div>
              <div class="relative">
                <span class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow"></span>
                <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">2015 ~ 2021</span>
                <h5 class="text-sm font-bold text-gray-900 mt-1">중국 이우 본사 신사옥 확장 & 광저우/심천 지사 네트워크 구축</h5>
                <p class="text-xs text-gray-600 mt-0.5">자체 검품 물류센터 운영 및 OEM/ODM 금형 제작 제조라인 연계</p>
              </div>
              <div class="relative">
                <span class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-300 border-2 border-white shadow"></span>
                <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">2000. 05</span>
                <h5 class="text-sm font-bold text-gray-900 mt-1">이유씨 무역 설립 (중국 현지 무역 거점 개설)</h5>
                <p class="text-xs text-gray-600 mt-0.5">한국 도소매 바이어 대상 이우 푸텐시장 가이드 및 수출입 사입 대행 개시</p>
              </div>
            </div>
          </div>

          <!-- 기업 비전 카드 -->
          <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <span class="text-xs font-bold text-blue-400 tracking-wider uppercase">Our Core Vision</span>
              <h4 class="text-xl sm:text-2xl font-black text-white mt-1">
                "가장 안전하고 신속한<br/><span class="text-sky-300">중국 무역 원스톱 파트너</span>"
              </h4>
              <p class="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
                단순 구매대행을 넘어 철저한 현지 전수검품, 신속한 통관·물류, 안정적인 단가 경쟁력 확보로 고객사의 글로벌 경쟁력을 극대화합니다.
              </p>
            </div>
            
            <div class="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700/60 text-center">
              <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span class="text-lg font-black text-blue-400 block">15년+</span>
                <span class="text-[10px] text-slate-300 font-medium">현지 무역 경력</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span class="text-lg font-black text-sky-400 block">10,000+</span>
                <span class="text-[10px] text-slate-300 font-medium">누적 진행 프로젝트</span>
              </div>
              <div class="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span class="text-lg font-black text-emerald-400 block">99.8%</span>
                <span class="text-[10px] text-slate-300 font-medium">고객 만족도</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3: 회사개요 -->
      <section id="overview" class="scroll-mt-24">
        <div class="text-center max-w-3xl mx-auto mb-12">
          <h2 class="text-xs sm:text-sm font-bold tracking-widest text-blue-600 uppercase mb-1">Company Overview</h2>
          <h3 class="text-2xl sm:text-3xl font-extrabold text-gray-900">
            회사개요
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
              <i class="fas fa-building"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-gray-400 block">기업명</span>
              <strong class="text-base font-bold text-gray-900">이유씨컴퍼니 (EUC Company)</strong>
              <p class="text-xs text-gray-500 mt-0.5">중국무역·구매대행·제작전문</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
              <i class="fas fa-user-tie"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-gray-400 block">경영진</span>
              <strong class="text-base font-bold text-gray-900">대표이사 이장춘 / 본부장 조해성</strong>
              <p class="text-xs text-gray-500 mt-0.5">15년 현지 무역 실무 경력</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
              <i class="fas fa-calendar-check"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-gray-400 block">설립일</span>
              <strong class="text-base font-bold text-gray-900">2000. 05. 15</strong>
              <p class="text-xs text-gray-500 mt-0.5">20년 이상의 안정된 업력</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex items-start gap-4 sm:col-span-2 lg:col-span-1">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
              <i class="fas fa-map-location-dot"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-gray-400 block">본사 및 지사 주소</span>
              <strong class="text-xs font-bold text-gray-900 block leading-snug">
                [중국주소] Warehouse No. 1, Block 38, Qingyan Liu C District, Yiwu City, Zhejiang Province
              </strong>
              <strong class="text-xs font-semibold text-gray-700 block mt-1">
                [한국지사] 광주광역시 북구 서방로135번길 54, 1층
              </strong>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
              <i class="fas fa-tags"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-gray-400 block">전문분야</span>
              <strong class="text-sm font-bold text-gray-900 block">잡화, 의류, DIY용품, 완구</strong>
              <p class="text-xs text-gray-500 mt-0.5">전자제품, 조화, 스포츠용품, 금형 등</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
              <i class="fas fa-users"></i>
            </div>
            <div>
              <span class="text-xs font-semibold text-gray-400 block">본사 직원 현황</span>
              <strong class="text-base font-bold text-gray-900">현지 전문 무역 인력 상주</strong>
              <p class="text-xs text-gray-500 mt-0.5">사입, 검품, 통관, 물류 전담팀 운영</p>
            </div>
          </div>

        </div>
      </section>

      <!-- Section 3: 사업영역 -->
      <section id="business" class="scroll-mt-24">
        <div class="text-center max-w-3xl mx-auto mb-12">
          <h2 class="text-xs sm:text-sm font-bold tracking-widest text-blue-600 uppercase mb-1">Business Scope</h2>
          <h3 class="text-2xl sm:text-3xl font-extrabold text-gray-900">
            주요 사업영역
          </h3>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div class="relative bg-slate-900 text-white rounded-2xl p-6 overflow-hidden shadow-lg group">
            <span class="text-5xl font-black text-white/10 absolute right-4 top-4 group-hover:text-blue-500/20 transition">01</span>
            <div class="relative z-10">
              <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center mb-4 text-white">
                <i class="fas fa-industry"></i>
              </div>
              <h4 class="text-lg font-bold mb-2">제품제작</h4>
              <p class="text-xs text-slate-300 leading-relaxed">
                OEM / ODM 주문제작, 금형 사출, 패키지 및 라벨 인쇄, 단체복 및 잡화 맞춤 생산
              </p>
            </div>
          </div>

          <div class="relative bg-slate-900 text-white rounded-2xl p-6 overflow-hidden shadow-lg group">
            <span class="text-5xl font-black text-white/10 absolute right-4 top-4 group-hover:text-blue-500/20 transition">02</span>
            <div class="relative z-10">
              <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center mb-4 text-white">
                <i class="fas fa-ship"></i>
              </div>
              <h4 class="text-lg font-bold mb-2">무역대행</h4>
              <p class="text-xs text-slate-300 leading-relaxed">
                현지 공장 핸들링, 시장조사, 단가 네고, 수출입 계약 및 통관 서류 원스톱 대행
              </p>
            </div>
          </div>

          <div class="relative bg-slate-900 text-white rounded-2xl p-6 overflow-hidden shadow-lg group">
            <span class="text-5xl font-black text-white/10 absolute right-4 top-4 group-hover:text-blue-500/20 transition">03</span>
            <div class="relative z-10">
              <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center mb-4 text-white">
                <i class="fas fa-cart-shopping"></i>
              </div>
              <h4 class="text-lg font-bold mb-2">구매대행</h4>
              <p class="text-xs text-slate-300 leading-relaxed">
                1688, 타오바오 등 온라인 및 도매시장 오프라인 사입, 현지 창고 검품 및 특송 발송
              </p>
            </div>
          </div>

          <div class="relative bg-slate-900 text-white rounded-2xl p-6 overflow-hidden shadow-lg group">
            <span class="text-5xl font-black text-white/10 absolute right-4 top-4 group-hover:text-blue-500/20 transition">04</span>
            <div class="relative z-10">
              <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center mb-4 text-white">
                <i class="fas fa-boxes-packing"></i>
              </div>
              <h4 class="text-lg font-bold mb-2">이커머스 & 3PL</h4>
              <p class="text-xs text-slate-300 leading-relaxed">
                쿠팡 로켓그로스 바코드 작업 및 직납, 3PL 보관·소분·개별 소비자 직배송 지원
              </p>
            </div>
          </div>

        </div>
      </section>

      <!-- Section 4: 협력사 소개 -->
      <section id="partner" class="scroll-mt-24">
        <div class="text-center max-w-3xl mx-auto mb-12">
          <h2 class="text-xs sm:text-sm font-bold tracking-widest text-blue-600 uppercase mb-1">Global Partnership</h2>
          <h3 class="text-2xl sm:text-3xl font-extrabold text-gray-900">
            협력사 및 파트너십
          </h3>
          <p class="mt-2 text-sm sm:text-base text-gray-600">
            15년 간 구축된 한·중 유력 제조공장 및 글로벌 물류 파트너와 함께합니다.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="p-6 rounded-2xl bg-slate-50 border border-gray-100 hover:border-blue-300 hover:shadow-lg transition space-y-3">
            <div class="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-xl font-black">
              1688
            </div>
            <h4 class="text-base font-bold text-gray-900">1688 소싱 파트너</h4>
            <p class="text-xs text-gray-600 leading-relaxed">
              알리바바 1688 인증 직영 공급업체 및 골드 서플라이어와 직계약 체결
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-slate-50 border border-gray-100 hover:border-blue-300 hover:shadow-lg transition space-y-3">
            <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl">
              <i class="fas fa-store"></i>
            </div>
            <h4 class="text-base font-bold text-gray-900">이우 푸텐시장 상가</h4>
            <p class="text-xs text-gray-600 leading-relaxed">
              이우 1~5기 주요 소상품 및 잡화·완구 도매 상가 네트워크 구축
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-slate-50 border border-gray-100 hover:border-blue-300 hover:shadow-lg transition space-y-3">
            <div class="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xl">
              <i class="fas fa-truck-fast"></i>
            </div>
            <h4 class="text-base font-bold text-gray-900">쿠팡 밀크런 직납사</h4>
            <p class="text-xs text-gray-600 leading-relaxed">
              쿠팡 로켓그로스 규격 포장 및 지정 FC센터 밀크런 트럭 직납 포워더
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-slate-50 border border-gray-100 hover:border-blue-300 hover:shadow-lg transition space-y-3">
            <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">
              <i class="fas fa-file-contract"></i>
            </div>
            <h4 class="text-base font-bold text-gray-900">관세법인 & FTA 파트너</h4>
            <p class="text-xs text-gray-600 leading-relaxed">
              한-중 FTA 원산지증명서 발급 및 전문 관세사 신속 정밀 통관 연계
            </p>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>
