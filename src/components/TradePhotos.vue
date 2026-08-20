<template>
  <section class="py-16 sm:py-24 bg-slate-900 text-white relative border-t border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      <!-- Section Title -->
      <div class="text-center max-w-3xl mx-auto space-y-3">
        <span class="text-xs font-bold tracking-widest text-blue-400 uppercase">
          EUC FIELD & GLOBAL INFRASTRUCTURE
        </span>
        <h2 class="text-3xl sm:text-4xl font-black tracking-tight text-white">
          EUC 중국 현지 인프라 & 포토 갤러리
        </h2>
        <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
          이우·광저우 현지 지사, 100% 직영 물류 창고, 검품 및 출고 현장의 생생한 사진입니다.
        </p>
      </div>

      <!-- Photo Grid (Modern Bento Aspect) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div 
          v-for="(photo, idx) in photos" 
          :key="idx"
          class="group relative aspect-4/3 rounded-2xl overflow-hidden shadow-lg border border-slate-800 bg-slate-950 transition-all duration-300 transform hover:-translate-y-1"
        >
          <img 
            :src="photo.src" 
            :alt="photo.title"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3.5">
            <span class="text-[11px] font-bold text-white tracking-wide">{{ photo.title }}</span>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
const photos = [
  { title: '협력업체 전경 1', src: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220705/1adb5ec7e0fafebbb5e7dc89cff66306.jpg' },
  { title: '협력업체 전경 2', src: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/126423774dc51c42329ec6009e0d60ba.jpg' },
  { title: '협력업체 생산라인', src: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/f1efb2fa696c8ee722eefc41515564eb.jpg' },
  { title: '중국 지사 직영 창고', src: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220705/259f4786e36e472d84506038a2c12202.jpg' },
  { title: '이유씨컴퍼니 사무실 전경', src: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/c6ba1137209f7ceca4e05c0fa713e15c.jpg' },
  { title: '현지 시장조사 미팅', src: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/1399dd7470e7eb8e2dc4e1ec6518910b.jpg' },
  { title: '이유씨컴퍼니 미팅룸', src: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/e8f44b217dc6caa92775e4ffa02bcba3.jpg' },
  { title: '생산 검수 현장', src: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220702/4abfcf1a777f2154a8f71ab0d36ddffe.jpg' },
  { title: '물류 출고 작업', src: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/product/big/20220705/b407d0f0d92bd84a69946676c52ce3e7.jpg' },
  { title: '이유씨컴퍼니 본사 전경', src: 'https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/site_img.png' }
]
</script>
