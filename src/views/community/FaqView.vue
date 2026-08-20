<template>
  <div class="bg-slate-50 min-h-screen">
    
    <!-- Hero Header -->
    <div class="relative bg-slate-900 py-12 sm:py-16 text-white overflow-hidden">
      <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs sm:text-sm font-bold tracking-wide mb-3">
            <i class="fas fa-question-circle text-blue-400"></i>
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>

          <h1 class="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
            자주하는 질문 (FAQ)
          </h1>

          <p class="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            중국 구매대행, 무역대행 OEM, 배송/통관, 시장투어 및 쿠팡 로켓그로스에 대해 가장 자주 묻는 질문들을 모았습니다.
          </p>

          <div class="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <router-link to="/" class="hover:text-white flex items-center gap-1">
              <i class="fas fa-home"></i> 홈
            </router-link>
            <span>&gt;</span>
            <span class="text-slate-300">고객센터</span>
            <span>&gt;</span>
            <span class="text-blue-400 font-semibold">자주하는 질문</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      
      <!-- Search Box Bar -->
      <div class="relative">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="궁금한 내용을 검색해 보세요 (예: MOQ, 통관, 결제, 바코드, 투어 등)"
          class="w-full pl-12 pr-10 py-4 rounded-2xl bg-white border-2 border-blue-600/20 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm sm:text-base shadow-sm outline-none transition"
        />
        <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 text-base"></i>
        <button 
          v-if="searchQuery" 
          @click="searchQuery = ''"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
        >
          <i class="fas fa-times-circle"></i>
        </button>
      </div>

      <!-- Category Filter Tabs -->
      <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
        <button 
          v-for="cat in categories" 
          :key="cat.id"
          @click="activeCategory = cat.id"
          class="px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200"
          :class="activeCategory === cat.id 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105' 
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- FAQ Accordion List -->
      <div v-if="filteredFaqs.length > 0" class="space-y-4 pt-4">
        <div 
          v-for="(faq, idx) in filteredFaqs" 
          :key="faq.id"
          class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-200 hover:border-blue-300"
        >
          <!-- Question Button -->
          <button 
            @click="toggleFaq(faq.id)" 
            class="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 focus:outline-none transition group"
            :class="openFaqId === faq.id ? 'bg-blue-50/40 text-blue-900' : 'text-gray-900'"
          >
            <div class="flex items-start gap-3.5">
              <span class="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition">
                Q
              </span>
              <div>
                <span class="inline-block text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mb-1">
                  {{ faq.categoryName }}
                </span>
                <h3 class="text-sm sm:text-base font-bold leading-snug group-hover:text-blue-600 transition">
                  {{ faq.question }}
                </h3>
              </div>
            </div>

            <!-- Arrow Icon with Rotate Animation -->
            <div 
              class="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-100 text-gray-400 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition-transform duration-300"
              :class="{ 'rotate-180 bg-blue-600 text-white': openFaqId === faq.id }"
            >
              <i class="fas fa-chevron-down text-xs"></i>
            </div>
          </button>

          <!-- Answer Content (Slide Down) -->
          <div 
            v-show="openFaqId === faq.id"
            class="p-5 sm:p-6 pt-0 border-t border-blue-100/50 bg-slate-50/60 text-xs sm:text-sm text-gray-700 leading-relaxed space-y-3 animate-fadeIn"
          >
            <div class="flex items-start gap-3.5 pt-4">
              <span class="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                A
              </span>
              <div class="space-y-2 whitespace-pre-line text-gray-700">
                <p>{{ faq.answer }}</p>
                
                <!-- Helper link if provided -->
                <div v-if="faq.link" class="pt-2">
                  <router-link :to="faq.link.to" class="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline">
                    <span>{{ faq.link.text }}</span>
                    <i class="fas fa-arrow-right text-[10px]"></i>
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results Fallback -->
      <div v-else class="text-center py-16 bg-white rounded-2xl border border-gray-100 space-y-3">
        <i class="fas fa-search-minus text-4xl text-gray-300"></i>
        <p class="text-sm font-bold text-gray-700">검색어와 일치하는 자주하는 질문이 없습니다.</p>
        <p class="text-xs text-gray-400">직접 1:1 상담을 통해 담당 매니저에게 질문해 보세요.</p>
        <div class="pt-2">
          <a 
            href="http://pf.kakao.com/_xmQWsK/chat" 
            target="_blank"
            class="inline-flex items-center gap-1.5 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-900 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <i class="fas fa-comment"></i>
            <span>카카오톡 1:1 실시간 질문하기</span>
          </a>
        </div>
      </div>

      <!-- Bottom Consultation Banner -->
      <div class="mt-12 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div class="space-y-1 text-center sm:text-left">
          <h3 class="text-lg sm:text-xl font-black">더 궁금하신 사항이 있으신가요?</h3>
          <p class="text-xs sm:text-sm text-slate-300">
            전문 무역/사입 매니저가 친절하고 신속하게 실시간으로 답변해 드립니다.
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <a 
            href="http://pf.kakao.com/_xmQWsK/chat" 
            target="_blank"
            class="px-5 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition shadow"
          >
            <i class="fas fa-comment"></i> 카카오톡 상담
          </a>
          <a 
            href="tel:010-9373-1214" 
            class="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 transition"
          >
            <i class="fas fa-phone-alt"></i> 전화 문의
          </a>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const activeCategory = ref('all')
const searchQuery = ref('')
const openFaqId = ref(1) // Default open first FAQ

const categories = [
  { id: 'all', name: '전체' },
  { id: 'purchase', name: '구매대행/결제' },
  { id: 'trade', name: '무역/OEM' },
  { id: 'shipping', name: '배송/통관' },
  { id: 'tour', name: '시장투어/가이드' },
  { id: 'rocket', name: '로켓그로스' }
]

const faqs = [
  {
    id: 1,
    category: 'purchase',
    categoryName: '구매대행/결제',
    question: '1688 상품 구매 시 최소 주문 수량(MOQ)이 정해져 있나요?',
    answer: `1688은 중국 내 B2B 도매 플랫폼으로 판매자마다 최소 구매 수량(보통 2~3개 이상)이 정해져 있습니다.
하지만 EUC 현지 매니저가 판매자와 직접 협상하여 샘플용으로 1개만 구매하거나, 여러 옵션을 혼합하여 최소 수량을 맞추는 사입도 적극 지원해 드립니다.`,
    link: { text: '구매대행 신청 바로가기', to: '/services/purchasing-agent' }
  },
  {
    id: 2,
    category: 'purchase',
    categoryName: '구매대행/결제',
    question: '구매대행 견적 확인 후 결제는 어떻게 진행되나요?',
    answer: `결제는 1차(상품 대금 + 대행 수수료)와 2차(국제 배송비 + 관부가세)로 나누어 진행됩니다.

1. 1차 결제: 주문서 접수 후 현지 재고가 확인되면 당일 고시환율이 적용된 원화 견적서를 발행해 드리며, 계좌이체 또는 카드 결제를 진행합니다.
2. 2차 결제: 중국 이우 창고에 상품이 입고된 후 실측 무게/부피를 측정하여 실제 국제 특송 배송비만 청구됩니다.`
  },
  {
    id: 3,
    category: 'rocket',
    categoryName: '로켓그로스',
    question: '쿠팡 로켓그로스 바코드 및 밀크런 입고 대행 시 필요한 준비물은 무엇인가요?',
    answer: `쿠팡 윙(Wing) 판매자 센터에서 생성된 아래의 파일들만 전달해 주시면 됩니다.

1. 상품 바코드 라벨 (PDF / 300DPI 권장)
2. 박스 부착용 외박스 라벨 (입고 생성 후 출력된 라벨)
3. 쿠팡 밀크런 입고 승인서 및 센터 지정 정보

전달해 주신 라벨을 중국 현지 직영 창고에서 규격에 맞춰 정밀 부착하고, 파레트 래핑 후 한국 세관 통관을 거쳐 밀크런 트럭으로 안전하게 직납합니다.`,
    link: { text: '로켓그로스 신청서 작성하기', to: '/services/rocket-growth' }
  },
  {
    id: 4,
    category: 'tour',
    categoryName: '시장투어/가이드',
    question: '이우 푸텐시장 투어 신청 시 비자 및 호텔 예약도 지원되나요?',
    answer: `네, 전 과정 지원해 드립니다!

1. 호텔 예약 지원: 푸텐시장 인근 추천 호텔(이우 햄튼 바이 힐튼, 샹그릴라 호텔 등)을 제휴 최저가로 예약 대행해 드리거나 트립닷컴 바로예약 링크를 안내해 드립니다.
2. 공항 픽업: 항저우(HGH), 상하이(PVG), 이우 공항에서 전용 차량으로 호텔까지 1:1 픽업 서비스를 제공합니다.
3. 1:1 통역 가이드: 단순 통역뿐 아니라 단가 협상, 샘플 사입, 수입 통관까지 무역 전문 매니저가 전 일정 동행합니다.`,
    link: { text: '이우 시장투어 실시간 견적 확인하기', to: '/guide/market-tour' }
  },
  {
    id: 5,
    category: 'shipping',
    categoryName: '배송/통관',
    question: '개인통관고유부호와 사업자 통관의 차이는 무엇인가요?',
    answer: `1. 개인통관고유부호 (자가사용 목적):
- 개인이 직접 소비할 목적으로 $150 이하(미국은 $200) 구매 시 관부가세가 면제되는 목록통관이 적용됩니다. (재판매 불가)

2. 사업자 통관 (국내 판매 목적):
- 쇼핑몰 판매, 스마트스토어, 쿠팡 판매를 위한 상품은 금액과 무관하게 반드시 사업자 명의로 정식 수입통관(관세/부가세 납부, 원산지 표기, 세금계산서 발행)을 진행하셔야 합니다.
- EUC는 한-중 FTA 원산지증명서 발급 대행을 통해 관세 감면 혜택을 극대화해 드립니다.`
  },
  {
    id: 6,
    category: 'trade',
    categoryName: '무역/OEM',
    question: '원하는 디자인으로 로고 인쇄 및 신규 금형 제작(OEM/ODM)이 가능한가요?',
    answer: `네, 15년 업력의 EUC 전문 무역팀이 1차 직영 공장과 직접 매칭해 드립니다.

- 로고 실크인쇄, 레이저 각인, 패키지 커스텀 박스 제작은 소량부터 가능합니다.
- 신규 사출 금형 개발의 경우 3D 도면 검토, 시제품 3D 프린팅 샘플링 후 본 금형 제작 및 양산까지 체계적인 품질 검수를 진행합니다.`,
    link: { text: '무역대행 OEM 견적 문의하기', to: '/services/trade-agent' }
  }
]

const toggleFaq = (id) => {
  openFaqId.value = openFaqId.value === id ? null : id
}

const filteredFaqs = computed(() => {
  return faqs.filter(item => {
    const matchCategory = activeCategory.value === 'all' || item.category === activeCategory.value
    const matchQuery = !searchQuery.value || 
      item.question.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchCategory && matchQuery
  })
})
</script>
