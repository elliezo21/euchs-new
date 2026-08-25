<template>
  <div class="min-h-screen bg-slate-50">

    <!-- 가이드 없음 -->
    <div v-if="!guide" class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 p-8">
      <div class="text-5xl">📄</div>
      <h2 class="text-xl font-black text-slate-800">가이드를 찾을 수 없습니다</h2>
      <p class="text-slate-500 text-sm">존재하지 않는 가이드 번호입니다.</p>
      <router-link to="/support/guide" class="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition">
        가이드 목록으로
      </router-link>
    </div>

    <template v-else>
      <!-- HERO -->
      <section class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14 px-4 sm:px-6">
        <div class="max-w-5xl xl:max-w-6xl mx-auto space-y-4">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="text-xs font-black font-mono px-3 py-1 rounded-full border"
              :class="[colors?.bg?.replace('50','900/30'), colors?.text?.replace('700','300'), 'border-white/20']"
            >
              NO.{{ guide.no }}
            </span>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-300">
              {{ guide.categoryLabel }}
            </span>
          </div>
          <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black leading-snug tracking-tight">
            {{ guide.title }}
          </h1>
          <p class="text-slate-300 text-sm sm:text-base leading-relaxed max-w-4xl">{{ guide.summary }}</p>
          <div class="flex flex-wrap gap-2 pt-2">
            <span
              v-for="tag in guide.tags"
              :key="tag"
              class="text-xs font-mono px-2.5 py-1 rounded-full bg-white/10 text-slate-300"
            >{{ tag }}</span>
          </div>
        </div>
      </section>

      <!-- CONTENT BODY -->
      <div class="max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        <!-- STEP 단계별 안내 -->
        <section class="space-y-6">
          <h2 class="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-black">📋</span>
            단계별 이용 방법
          </h2>
          <div class="space-y-5">
            <div
              v-for="s in guide.steps"
              :key="s.step"
              class="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-3 shadow-xs transition hover:border-slate-300 hover:shadow-sm"
            >
              <div class="flex items-center gap-3">
                <span
                  class="w-8 h-8 rounded-xl text-white text-sm font-black flex items-center justify-center shrink-0 shadow-xs"
                  :class="colors?.accent || 'bg-slate-700'"
                >
                  {{ s.step }}
                </span>
                <h3 class="font-black text-base sm:text-lg text-slate-900 leading-snug">{{ s.title }}</h3>
              </div>
              <p class="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line pl-0 sm:pl-11">{{ s.content }}</p>
            </div>
          </div>
        </section>

        <!-- TIP BOX -->
        <section v-if="guide.tips?.length" class="space-y-4">
          <h2 class="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2.5">
            <span>💡</span> 실무 TIP
          </h2>
          <div class="bg-amber-50/80 border border-amber-200 rounded-2xl p-6 md:p-7 space-y-3">
            <div
              v-for="(tip, i) in guide.tips"
              :key="i"
              class="flex items-start gap-3 text-sm sm:text-base text-amber-950"
            >
              <i class="fas fa-lightbulb text-amber-500 mt-1 shrink-0 text-sm"></i>
              <span class="leading-relaxed font-medium">{{ tip }}</span>
            </div>
          </div>
        </section>

        <!-- CAUTION BOX -->
        <section v-if="guide.cautions?.length" class="space-y-4">
          <h2 class="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2.5">
            <span>⚠️</span> 주의사항
          </h2>
          <div class="bg-rose-50/80 border border-rose-200 rounded-2xl p-6 md:p-7 space-y-3">
            <div
              v-for="(caution, i) in guide.cautions"
              :key="i"
              class="flex items-start gap-3 text-sm sm:text-base text-rose-950"
            >
              <i class="fas fa-triangle-exclamation text-rose-500 mt-1 shrink-0 text-sm"></i>
              <span class="leading-relaxed font-medium">{{ caution }}</span>
            </div>
          </div>
        </section>

        <!-- 인접 가이드 네비게이션 -->
        <div class="grid grid-cols-2 gap-4" v-if="prevGuide || nextGuide">
          <router-link
            v-if="prevGuide"
            :to="'/support/guide/' + prevGuide.id"
            class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-left hover:border-blue-400 hover:shadow-md transition group"
          >
            <p class="text-xs text-slate-400 font-mono mb-1.5">← 이전 가이드</p>
            <p class="text-sm font-black text-slate-800 group-hover:text-blue-600 transition line-clamp-2">{{ prevGuide.title }}</p>
          </router-link>
          <div v-else></div>
          <router-link
            v-if="nextGuide"
            :to="'/support/guide/' + nextGuide.id"
            class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-right hover:border-blue-400 hover:shadow-md transition group"
          >
            <p class="text-xs text-slate-400 font-mono mb-1.5">다음 가이드 →</p>
            <p class="text-sm font-black text-slate-800 group-hover:text-blue-600 transition line-clamp-2">{{ nextGuide.title }}</p>
          </router-link>
        </div>

        <!-- BOTTOM ACTION BUTTONS -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-6 border-t border-slate-200">
          <router-link
            to="/support/guide"
            class="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition flex-1 sm:flex-none"
          >
            <i class="fas fa-arrow-left text-xs"></i>
            가이드 목록으로 돌아가기
          </router-link>
          <a
            href="http://pf.kakao.com/_xmQWsK/chat"
            target="_blank"
            class="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black text-sm transition active:scale-95 shadow-sm flex-1 sm:flex-none"
          >
            <i class="fas fa-comment-dots"></i>
            1:1 전담 매니저 카톡 상담
          </a>
          <router-link
            to="/mall"
            class="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm transition active:scale-95 shadow-sm flex-1 sm:flex-none"
          >
            <i class="fas fa-store text-xs"></i>
            1688 소싱몰 바로가기
          </router-link>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { GUIDE_ITEMS, CATEGORY_COLOR_MAP } from '@/data/guideData.js'

const route = useRoute()

const guide = computed(() => {
  const id = parseInt(route.params.id)
  return GUIDE_ITEMS.find(g => g.id === id) || null
})

const colors = computed(() => {
  if (!guide.value) return null
  return CATEGORY_COLOR_MAP[guide.value.color] || null
})

const currentIndex = computed(() => {
  if (!guide.value) return -1
  return GUIDE_ITEMS.findIndex(g => g.id === guide.value.id)
})

const prevGuide = computed(() => {
  if (currentIndex.value <= 0) return null
  return GUIDE_ITEMS[currentIndex.value - 1]
})

const nextGuide = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= GUIDE_ITEMS.length - 1) return null
  return GUIDE_ITEMS[currentIndex.value + 1]
})
</script>

<style scoped>
.line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
</style>
