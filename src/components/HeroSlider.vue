<template>
  <section class="relative w-full overflow-hidden bg-slate-900 select-none">
    <!-- Slider Container -->
    <div class="relative w-full h-[480px] sm:h-[560px] md:h-[620px] lg:h-[700px]">
      <div 
        v-for="(slide, index) in slides" 
        :key="index"
        class="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out"
        :class="currentSlide === index ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'"
      >
        <!-- Background Image (PC & Mobile) -->
        <picture>
          <source media="(max-width: 640px)" :srcset="slide.moImage" />
          <img 
            :src="slide.pcImage" 
            :alt="slide.title" 
            class="w-full h-full object-cover object-center transform scale-105 transition-transform duration-[6000ms]"
            :class="currentSlide === index ? 'scale-100' : 'scale-105'"
          />
        </picture>

        <!-- Dark Gradient Overlay for readability -->
        <div class="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-transparent flex items-center">
          <div class="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full text-white">
            <div class="max-w-2xl space-y-4 sm:space-y-6" :class="{ 'animate-fade-in': currentSlide === index }">
              
              <!-- Badge -->
              <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/90 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold tracking-wide shadow-sm">
                <i class="fas fa-certificate text-yellow-300"></i>
                <span>15년 노하우 중국무역 전문 파트너</span>
              </div>

              <!-- Main Title -->
              <h1 class="text-2xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-md">
                {{ slide.title }}
              </h1>

              <!-- Subtitle Bullet points -->
              <div class="text-sm sm:text-base md:text-lg text-slate-200 leading-relaxed font-normal space-y-1.5 drop-shadow">
                <p v-for="(line, lineIdx) in slide.subtitleLines" :key="lineIdx" class="flex items-center gap-2">
                  <i class="fas fa-check-circle text-blue-400 text-sm"></i>
                  <span>{{ line }}</span>
                </p>
              </div>

              <!-- Contact Box -->
              <div class="pt-2 sm:pt-4">
                <div class="inline-block bg-black/50 backdrop-blur-md border border-white/20 rounded-xl p-4 sm:p-5 text-xs sm:text-sm text-slate-200">
                  <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div class="flex items-center gap-2">
                      <i class="fas fa-phone-volume text-blue-400 text-base"></i>
                      <span><strong>상담문의:</strong> {{ slide.phones }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="fas fa-comment-dots text-yellow-400 text-base"></i>
                      <span><strong>카톡:</strong> {{ slide.kakao }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- CTA Buttons -->
              <div class="pt-2 flex flex-wrap gap-3">
                <a 
                  href="http://pf.kakao.com/_xmQWsK/chat" 
                  target="_blank"
                  class="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition text-sm sm:text-base"
                >
                  <i class="fas fa-comment"></i>
                  <span>카카오톡 실시간 상담</span>
                </a>
                <router-link 
                  to="/guide"
                  class="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/40 font-semibold px-5 py-3 rounded-lg transition text-sm sm:text-base"
                >
                  <span>요금표 안내 바로가기</span>
                  <i class="fas fa-arrow-right text-xs"></i>
                </router-link>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Arrows -->
    <button 
      @click="prevSlide" 
      class="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition border border-white/10"
      aria-label="이전 슬라이드"
    >
      <i class="fas fa-chevron-left text-lg"></i>
    </button>
    <button 
      @click="nextSlide" 
      class="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition border border-white/10"
      aria-label="다음 슬라이드"
    >
      <i class="fas fa-chevron-right text-lg"></i>
    </button>

    <!-- Slide Indicators -->
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/15">
      <button 
        v-for="(_, index) in slides" 
        :key="index"
        @click="goToSlide(index)"
        class="h-2.5 rounded-full transition-all duration-300"
        :class="currentSlide === index ? 'w-8 bg-blue-500' : 'w-2.5 bg-white/50 hover:bg-white/80'"
        :aria-label="`슬라이드 ${index + 1}`"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const currentSlide = ref(0)
let timer = null

const slides = [
  {
    pcImage: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/main_slide1.jpg',
    moImage: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/mobile_main_slide1.jpg',
    title: '변화와 혁신으로 무장한 EUC 입니다!',
    subtitleLines: [
      '통관보장, 관세절감',
      '정확하고 투명한 부피측정',
      '언제든지 문의주시면 실시간 회신',
      '기본값 외 추가비용 NO'
    ],
    phones: '010-9373-1214 / +86 195-2407-7350',
    kakao: 'ericcho0710 / calvinli'
  },
  {
    pcImage: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/main_slide2.jpg',
    moImage: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/mobile_main_slide2.jpg',
    title: '어떠한 비교견적도 두렵지 않습니다.',
    subtitleLines: [
      '100% 투명하고 정직한 견적',
      '고객님의 문의를 24시간 실시간 대기',
      '현지 직영 창고에서의 철저한 전수 검품'
    ],
    phones: '010-9373-1214 / +86 195-2407-7350',
    kakao: 'ericcho0710 / calvinli'
  }
]

const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % slides.length
  resetTimer()
}

const prevSlide = () => {
  currentSlide.value = (currentSlide.value - 1 + slides.length) % slides.length
  resetTimer()
}

const goToSlide = (idx) => {
  currentSlide.value = idx
  resetTimer()
}

const resetTimer = () => {
  if (timer) clearInterval(timer)
  timer = setInterval(nextSlide, 5000)
}

onMounted(() => {
  timer = setInterval(nextSlide, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
