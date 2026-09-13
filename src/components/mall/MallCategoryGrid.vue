<template>
  <!-- 카테고리 이미지 카드 그리드 섹션 -->
  <section class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <!-- 헤더 -->
    <div class="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
      <div>
        <h2 class="text-sm sm:text-base font-black text-gray-900">🏬 전체 카테고리</h2>

      </div>
      <span class="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-black">ALL</span>
    </div>

    <!-- 카드 그리드 -->
    <div class="p-3 sm:p-4">
      <div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 sm:gap-3">
        <button
          v-for="cat in displayCategories"
          :key="cat.id"
          type="button"
          @click="$emit('select', cat)"
          class="group flex flex-col items-center gap-1.5 p-2 sm:p-2.5 rounded-xl border border-gray-100 hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 active:scale-95 cursor-pointer text-center"
        >
          <!-- 이미지 -->
          <div class="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm">
            <img
              :src="cat.imageUrl"
              :alt="cat.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              @error="(e) => handleImgError(e, cat)"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </div>
          <!-- 텍스트 -->
          <span class="text-[10px] sm:text-[11px] font-bold text-gray-700 group-hover:text-orange-600 leading-tight transition-colors line-clamp-2 w-full">
            {{ cat.shortName || cat.name }}
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  displayCategories: {
    type: Array,
    default: () => []
  }
})

defineEmits(['select'])

function handleImgError(e, cat) {
  // 이미지 로드 실패 시 이모지 배경으로 대체
  e.target.style.display = 'none'
  const parent = e.target.parentElement
  if (parent && !parent.querySelector('.emoji-fallback')) {
    const span = document.createElement('span')
    span.className = 'emoji-fallback absolute inset-0 flex items-center justify-center text-3xl bg-gradient-to-br from-orange-50 to-amber-50'
    span.textContent = cat.emoji || '📦'
    parent.appendChild(span)
  }
}
</script>
