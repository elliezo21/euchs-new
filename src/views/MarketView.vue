<template>
  <div class="bg-white">
    <!-- Sub Header Hero Banner -->
    <div class="relative bg-slate-900 py-14 sm:py-20 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <span class="text-xs sm:text-sm font-bold tracking-widest text-blue-400 uppercase mb-2 inline-block">
          China Wholesale Markets
        </span>
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
          중국 3대 도매시장
        </h1>
        <p class="mt-3 text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
          세계 최대의 소상품·의류·전자 산업 중심지 현장 조사 및 직사입을 지원합니다.
        </p>

        <!-- Breadcrumb -->
        <div class="mt-6 flex justify-center items-center gap-2 text-xs text-slate-400">
          <router-link to="/" class="hover:text-white flex items-center gap-1">
            <i class="fas fa-home"></i> 홈
          </router-link>
          <span>&gt;</span>
          <span class="text-blue-400 font-semibold">중국 도매시장</span>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
      
      <!-- Market 1: 이우 푸텐시장 -->
      <section id="yiwu" class="scroll-mt-24 bg-slate-50 rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10">
          
          <div class="lg:col-span-5 relative rounded-2xl overflow-hidden shadow aspect-4/3 lg:aspect-auto lg:h-[340px] bg-slate-200">
            <img 
              src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/yw.jpg" 
              alt="이우 푸텐시장" 
              class="w-full h-full object-cover"
            />
            <div class="absolute top-3 left-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              소상품 세계 1위
            </div>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-blue-600 uppercase tracking-wide">YIWU MARKET</span>
              <span class="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">자사 점포 입주</span>
            </div>

            <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900">
              이우 푸텐시장 <span class="text-base sm:text-lg font-normal text-gray-500">(义乌市国际商贸城)</span>
            </h2>

            <p class="text-base font-semibold text-blue-900 leading-snug">
              “전세계 소상품 시장 규모 1위! 이우에 없으면 세상에 없다는 말이 나올 정도로 방대한 규모”
            </p>

            <p class="text-sm text-gray-600 leading-relaxed">
              7만 개 이상의 점포가 1구역부터 5구역까지 테마별로 형성되어 있으며, 전 세계 바이어들이 연중 방문하는 글로벌 무역의 심장입니다. 일상잡화, 완구, 공예품, 문구, 인테리어 소품 등 다양한 아이템을 공장도 가격으로 사입할 수 있습니다.
            </p>

            <div class="bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1.5">
              <p class="flex items-center gap-2">
                <i class="fas fa-map-marker-alt text-red-500"></i>
                <span><strong>주소:</strong> 浙江省金华市义乌市稠城街道义乌市国际商贸城一区福田市场</span>
              </p>
              <p class="flex items-center gap-2">
                <i class="fas fa-phone-alt text-blue-500"></i>
                <span><strong>현지 지사 직통:</strong> +86 195-2407-7350 / 010-9373-1214</span>
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-2">
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#잡화</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#DIY용품</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#완구</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#주방용품</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#생활용품</span>
            </div>
          </div>

        </div>
      </section>

      <!-- Market 2: 광저우 시장 -->
      <section id="guangzhou" class="scroll-mt-24 bg-slate-50 rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10">
          
          <div class="lg:col-span-5 relative rounded-2xl overflow-hidden shadow aspect-4/3 lg:aspect-auto lg:h-[340px] bg-slate-200">
            <img 
              src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/gz.jpg" 
              alt="광저우 13행 의류시장" 
              class="w-full h-full object-cover"
            />
            <div class="absolute top-3 left-3 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              패션·의류 최대 중심지
            </div>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-indigo-600 uppercase tracking-wide">GUANGZHOU MARKET</span>
            </div>

            <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900">
              광저우 시장 <span class="text-base sm:text-lg font-normal text-gray-500">(广州十三行服装批发街)</span>
            </h2>

            <p class="text-base font-semibold text-indigo-900 leading-snug">
              “주로 고품질 의류, 패션 잡화, 가방, 가죽, 부자재를 전문적으로 취급”
            </p>

            <p class="text-sm text-gray-600 leading-relaxed">
              광저우는 하이퀄리티 의류 및 잡화를 생산하며, 이우와 달리 소량 구매 및 빠른 트렌드 사입이 가능하여 국내 동대문 및 유명 쇼핑몰 바이어들의 필수 방문지입니다. 봉제, 무봉제, 데님, 프리미엄 여성복까지 폭넓은 스펙트럼을 제공합니다.
            </p>

            <div class="bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1.5">
              <p class="flex items-center gap-2">
                <i class="fas fa-map-marker-alt text-red-500"></i>
                <span><strong>주소:</strong> 广州市荔湾区十三行路人民南路站</span>
              </p>
              <p class="flex items-center gap-2">
                <i class="fas fa-phone-alt text-blue-500"></i>
                <span><strong>문의:</strong> 0086-180-5893-3760 / 010-9373-1214</span>
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-2">
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#봉제</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#무봉제</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#데님의류</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#패션액세서리</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#가방·신발</span>
            </div>
          </div>

        </div>
      </section>

      <!-- Market 3: 심천 화창베이 시장 -->
      <section id="shenzhen" class="scroll-mt-24 bg-slate-50 rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10">
          
          <div class="lg:col-span-5 relative rounded-2xl overflow-hidden shadow aspect-4/3 lg:aspect-auto lg:h-[340px] bg-slate-200">
            <img 
              src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/sz.jpg" 
              alt="심천 화창베이 전자상가" 
              class="w-full h-full object-cover"
            />
            <div class="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              세계 최대 전자상가
            </div>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-emerald-600 uppercase tracking-wide">SHENZHEN MARKET</span>
            </div>

            <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900">
              심천 화창베이 시장 <span class="text-base sm:text-lg font-normal text-gray-500">(深圳华强北)</span>
            </h2>

            <p class="text-base font-semibold text-emerald-900 leading-snug">
              “세계 최대 전자 산업 스타트업의 메카! 전 세계 스마트 기기 및 디지털 부품의 70% 집중”
            </p>

            <p class="text-sm text-gray-600 leading-relaxed">
              중국 최고의 혁신 전자 클러스터 화창베이는 스마트폰 부품, 악세서리, 드론, 스마트워치, PC 부품 및 IoT 장비 등 최첨단 디지털 용품을 가장 빠르게 확보할 수 있는 글로벌 전자 유통의 메카입니다.
            </p>

            <div class="bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1.5">
              <p class="flex items-center gap-2">
                <i class="fas fa-map-marker-alt text-red-500"></i>
                <span><strong>주소:</strong> 广东省深圳市福田区振兴路411栋</span>
              </p>
              <p class="flex items-center gap-2">
                <i class="fas fa-phone-alt text-blue-500"></i>
                <span><strong>문의:</strong> 0086-180-5893-3760 / 010-9373-1214</span>
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-2">
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#스마트폰</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#악세서리</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#컴퓨터관련</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#디지털용품</span>
              <span class="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">#스마트기기</span>
            </div>
          </div>

        </div>
      </section>

    </div>
  </div>
</template>
