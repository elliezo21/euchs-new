<template>
  <section id="products" class="py-16 sm:py-24 bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Section Title -->
      <div class="text-center max-w-3xl mx-auto mb-10">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full mb-2">
          <i class="fas fa-cubes"></i>
          <span>1688 DIRECT SOURCING</span>
        </div>
        <h2 class="text-xs sm:text-sm font-bold tracking-widest text-blue-600 uppercase mb-2">Recommendation</h2>
        <p class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
          추천상품리스트
        </p>
        <p class="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
          중국 최대 B2B 도매 플랫폼 1688 및 이우 시장의 우수 카테고리 제품을 정기적으로 추천해 드립니다.<br class="hidden sm:inline">
          <span class="text-xs text-gray-400">※ 다른 고객님의 주문 제작 상품은 보안상 공유할 수 없는 점 양해 부탁드립니다.</span>
        </p>
        <div class="mt-4 w-12 h-1 bg-blue-600 mx-auto rounded-full"></div>
      </div>

      <!-- Category Tabs -->
      <div class="flex flex-wrap justify-center items-center gap-2 sm:gap-3 mb-8">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="currentTab = tab.id"
          class="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5"
          :class="currentTab === tab.id 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105' 
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'"
        >
          <span>{{ tab.name }}</span>
        </button>
      </div>

      <!-- 1688 Category Direct Search Link Bar -->
      <div class="mb-8 text-center">
        <a 
          :href="currentCategoryLink" 
          target="_blank" 
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 text-xs sm:text-sm font-black rounded-full shadow-md hover:shadow-lg transition"
        >
          <i class="fas fa-search"></i>
          <span>1688에서 '{{ currentTabName }}' 실시간 도매 단가 및 공장 검색하기</span>
          <i class="fas fa-arrow-up-right-from-square text-xs"></i>
        </a>
      </div>

      <!-- Products Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
        <div 
          v-for="(item, idx) in activeProducts" 
          :key="idx"
          class="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 transform hover:-translate-y-1 flex flex-col"
        >
          <a 
            :href="item.link || currentCategoryLink" 
            target="_blank" 
            rel="noopener noreferrer"
            class="relative aspect-square w-full bg-gray-100 overflow-hidden block cursor-pointer"
          >
            <img 
              :src="item.image" 
              :alt="item.name" 
              class="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
              loading="lazy"
            />
            <div class="absolute top-2 left-2 bg-slate-900/70 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded">
              {{ item.tag || '추천' }}
            </div>
            <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <span class="px-2.5 py-1 bg-white text-slate-900 text-[11px] font-bold rounded shadow">
                1688 보기 &rarr;
              </span>
            </div>
          </a>

          <div class="p-3.5 flex flex-col justify-between flex-grow">
            <div>
              <h3 class="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition">
                <a :href="item.link || currentCategoryLink" target="_blank" rel="noopener noreferrer">
                  {{ item.name }}
                </a>
              </h3>
              <p class="text-[11px] text-gray-500 mt-1 line-clamp-1">
                {{ item.desc || '중국 현지 공장 직거래' }}
              </p>
            </div>

            <div class="mt-3 space-y-1.5">
              <a 
                :href="item.link || currentCategoryLink" 
                target="_blank"
                rel="noopener noreferrer"
                class="block w-full py-1.5 text-center text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-slate-950 rounded transition flex items-center justify-center gap-1 border border-amber-200/60"
              >
                <i class="fas fa-tags text-[10px]"></i>
                <span>1688 단가 조회</span>
              </a>

              <a 
                href="http://pf.kakao.com/_xmQWsK/chat" 
                target="_blank"
                class="block w-full py-1 text-center text-[10px] font-semibold text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded transition"
              >
                사입 대행 문의
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Inquire CTA -->
      <div class="mt-12 text-center">
        <div class="inline-flex flex-col sm:flex-row items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <span class="text-xs sm:text-sm text-gray-700 font-medium">
            원하시는 상품이나 찾으시는 특정 공장이 있으신가요?
          </span>
          <a 
            href="http://pf.kakao.com/_xmQWsK/chat" 
            target="_blank"
            class="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 text-xs sm:text-sm font-bold rounded-lg transition"
          >
            <i class="fas fa-comment"></i>
            <span>맞춤 상품조사 의뢰하기</span>
          </a>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'

const currentTab = ref('List1')

const tabs = [
  { id: 'List1', name: '생활잡화', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%C8%D5%D3%C3%B0%D9%BB%F5' },
  { id: 'List2', name: '의류제작', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%C7%B9%D7%B0' },
  { id: 'List3', name: '교구완구', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%CD%E7%BE%DF' },
  { id: 'List4', name: '공업용제품', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%CE%E5%BD%F0%B9%A4%BE%DF' },
  { id: 'List5', name: '스포츠용품', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%BB%A4%CD%E2%D4%CB%B6%AF' },
  { id: 'List6', name: '기타/판촉', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%C0%F1%C6%B7%B4%D9%CF%FA' }
]

const currentCategoryLink = computed(() => {
  const current = tabs.find(t => t.id === currentTab.value)
  return current ? current.link : 'https://s.1688.com/'
})

const currentTabName = computed(() => {
  const current = tabs.find(t => t.id === currentTab.value)
  return current ? current.name : ''
})

const productData = {
  List1: [
    { name: '수납용품', desc: '다용도 패브릭/플라스틱 수납함', tag: '생활잡화', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%CA%D5%C4%C9%D3%C3%C6%B7', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/417df5cbdc899a3ae2726abc5b6aa8d6.jpg' },
    { name: '리빙박스', desc: '대용량 투명/접이식 리빙박스', tag: '생활잡화', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%CA%D5%C4%C9%CF%E4', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/5d13bdcfbd4cbd40c66e98b745166f07.jpg' },
    { name: '주방용품', desc: '실리콘/스텐 키친툴 세트', tag: '생활잡화', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%B3%F8%B7%BF%D3%C3%C6%B7', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/e9e713e3683905bd846975f421ed1203.jpg' },
    { name: '식기&그릇', desc: '도자기/세라믹 테이블웨어', tag: '생활잡화', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%B2%CD%BE%DF', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/5cba45c2a78007d97ba70af5ed86d8bf.jpg' },
    { name: '판촉물', desc: '기업 홍보/사은품/기프트', tag: '생활잡화', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%C0%F1%C6%B7%B4%D9%CF%FA', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/fc17d0044f7503467b9b11c987d7f865.jpg' },
    { name: '캠핑용품', desc: '폴딩체어/캠핑박스/랜턴', tag: '생활잡화', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%C2%B6%D3%AA%D3%C3%C6%B7', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/3b5b774c845f0a248c00af255db9c638.jpg' }
  ],
  List2: [
    { name: '기본티셔츠제작', desc: '순면 20수/30수 단체복 및 라벨링', tag: '의류제작', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=T%D0%F4%B6%A8%D6%C6', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/cb34ef0ab13f9177479e78999ac69d9f.jpg' },
    { name: '여성의류제작', desc: '원피스, 블라우스, 슬랙스 맞춤생산', tag: '의류제작', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%C5%AE%D7%B0%B6%A8%D6%C6', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/474d77ae6afce2a68ac7da885e506d43.jpg' },
    { name: '니트스웨터전문제작', desc: '고급 울/아크릴 원사 니트 가공', tag: '의류제작', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%D1%F2%C3%AB%C9%Cparam', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/1e0c8d218c1073b769f87790e1f048c0.jpg' },
    { name: '청바지전문제작', desc: '데님 워싱, 핏 디자인 및 OEM', tag: '의류제작', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%C牛%D0%D0%BF%E3%B6%A8%D6%C6', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/1c58a4ae8b90d748067bd530fa16ff9c.jpg' },
    { name: '아우터패딩전문제작', desc: '다운/웰론 패딩 점퍼 전문 생산', tag: '의류제작', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%D3%F0%C8%DE%B7%FE%B6%A8%D6%C6', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/9a97edb16915d1e12aa32a7fee0c62a6.jpg' },
    { name: '유니폼전문제작', desc: '식당/기업/매장 작업복 유니폼', tag: '의류제작', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%B9%A4%D7%F7%B7%FE%B6%A8%D6%C6', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/fd648b7406d47ed1944f7352b48e36d4.jpg' }
  ],
  List3: [
    { name: '완구전문판매', desc: 'RC카/블록/키즈토이 완구', tag: '교구완구', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%CD%E7%BE%DF', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/5a5adac8726a2b9623742eb21a17dd65.jpg' },
    { name: '교구전문판매', desc: '몬테소리/원목 교육용 교구', tag: '교구완구', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%BD%CC%BE%DF', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/c5e379c62be4b6acf36221d8409fe43d.jpg' },
    { name: '창의발달교구', desc: '퍼즐, 보드게임, 과학교구', tag: '교구완구', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%D2%E6%D6%C7%CD%E7%BE%DF', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/3de74afb9f9febc85b2e99cd26ae77f2.jpg' },
    { name: '유아체육교구', desc: '실내 놀이 및 소근육 발달 완구', tag: '교구완구', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%D3%D7%B6%F9%CC%E5%D3%FD', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/6d813e66453cf810467e7ad12589bc79.jpg' },
    { name: '교육기관안전매트', desc: '어린이집/유치원 친환경 폼매트', tag: '교구완구', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%C5%C0%D0%D0%B5%E6', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/79a53bb070cfb5dc6efc6f466b1fe037.jpg' }
  ],
  List4: [
    { name: '가죽공예 불박기 & 수공구', desc: '핫스탬핑 각인기 및 가죽 툴', tag: '공업용제품', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%CC%CC%D3%A1%BB%FA', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220826/fab1d7aef4e844310523081d6493da73.jpg' },
    { name: '사출금형제작', desc: '플라스틱/다이캐스팅 정밀 금형', tag: '공업용제품', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%D7%A2%CB%DC%C4%A3%BE%DF', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/e4bd2f6a2a26b7dc8edd64cdf7b9106d.jpg' },
    { name: '플라스틱사출업체', desc: '각종 산업용/생활용 부품 사출', tag: '공업용제품', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%CB%DC%BD%BA%BC%D3%B9%A4', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/d940e5f43fc709a1d11216b6a8639a68.jpg' },
    { name: '악세사리/부자재', desc: '목걸이, 귀걸이, 반지 부자재 대행', tag: '공업용제품', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%CA%CE%C6%B7%C7%B9%BC%FE', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220925/5b2b7fcbbd28ff2ee329e462799373a4.png' }
  ],
  List5: [
    { name: '피트니스용품 01', desc: '요가매트, 폼롤러, 튜빙밴드', tag: '스포츠용품', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%F3%A4%F6%A4%D3%C3%C6%B7', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/aef6eed094e982ae6c3065c20c84a1ec.jpg' },
    { name: '피트니스용품 02', desc: '덤벨, 케틀벨, 홈트레이닝 기구', tag: '스포츠용품', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%BD%A1%C9%ED%C6%F7%B2%C4', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/2c73c13a01f2067b3b9337001f4e4103.jpg' }
  ],
  List6: [
    { name: '판촉물 & 기프트', desc: '인쇄/각인 포함 기념품 제작', tag: '기타', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%C0%F1%C6%B7%B4%D9%CF%FA', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/fc17d0044f7503467b9b11c987d7f865.jpg' },
    { name: '가죽공예 수공구', desc: '공방용 전문 도구 세트', tag: '기타', link: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%C6%A4%B8%EF%B9%A4%BE%DF', image: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220826/fab1d7aef4e844310523081d6493da73.jpg' }
  ]
}

const activeProducts = computed(() => {
  return productData[currentTab.value] || []
})
</script>
