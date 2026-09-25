<template>
  <div class="max-w-[1120px] mx-auto px-4 sm:px-8 py-10 sm:py-12 space-y-12">
    <!-- 5-1. 히어로 -->
    <section class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center lg:min-h-[320px]">
      <div>
        <div class="st-label">EUCHS STUDIO</div>
        <h1 class="st-h-hero mt-3">1688 상품 사진, 한국 상세페이지로</h1>
        <p class="mt-4 text-[16px] st-ink-2 leading-relaxed">중국어를 지우고, 한글을 올리고, 쿠팡·자사몰에 쓸 상세페이지로 내보내요.</p>
        <div class="mt-7 flex flex-wrap gap-2.5">
          <router-link v-if="currentUser" :to="{ name: 'studio-projects' }" class="st-btn st-btn-primary st-btn-xl">
            작업 시작하기 <ArrowRight class="w-4 h-4" :stroke-width="2.5" />
          </router-link>
          <button v-else type="button" class="st-btn st-btn-primary st-btn-xl" @click="loginAndStart">
            로그인하고 시작하기 <ArrowRight class="w-4 h-4" :stroke-width="2.5" />
          </button>
          <button type="button" class="st-btn st-btn-xl" @click="scrollToHow">사용법 보기</button>
        </div>
      </div>
      <!-- 전/후 비교 자리 — 실제 결과 이미지는 1-6b 이후에 넣는다 -->
      <div class="grid grid-cols-2 gap-3">
        <div v-for="label in ['원본', '편집 후']" :key="label" class="relative h-[260px] rounded-[16px] st-placeholder st-border">
          <span class="st-badge st-badge-white absolute left-3 top-3">{{ label }}</span>
          <ImageIcon class="w-8 h-8" :stroke-width="1.5" />
        </div>
      </div>
    </section>

    <!-- 5-2. 새 소식 -->
    <section>
      <div class="flex items-center mb-4">
        <h2 class="st-h-section">새 소식</h2>
        <span class="ml-auto text-[13px] st-muted cursor-not-allowed" title="준비 중이에요">전체 보기</span>
      </div>
      <p v-if="noticeError" class="text-[14px] font-bold st-danger-text">{{ noticeError }}</p>
      <ul v-else class="st-card st-divide overflow-hidden">
        <li v-for="(n, i) in notices" :key="i" class="flex items-center gap-3 px-5 py-3.5 min-w-0">
          <span class="w-[84px] shrink-0 text-[13px] st-muted tabular-nums">{{ n.date ? n.date.replaceAll('-', '.') : '예정' }}</span>
          <span class="st-badge shrink-0" :class="TYPE_CLASS[n.type]">{{ TYPE_LABEL[n.type] }}</span>
          <span class="min-w-0 flex-1 truncate text-[14px] font-semibold st-ink">{{ n.title }}</span>
          <span v-if="isNew(n.date)" class="st-badge st-badge-solid shrink-0">NEW</span>
        </li>
      </ul>
    </section>

    <!-- 5-3. 이어서 작업하기 (로그인 + 프로젝트 1개 이상) -->
    <div v-if="currentUser" v-show="recentCount > 0">
      <StudioRecentProjects title="이어서 작업하기" :limit="4" @loaded="n => (recentCount = n)">
        <template #link>
          <router-link :to="{ name: 'studio-projects' }" class="st-link-muted text-[13px]">모든 작업 보기 →</router-link>
        </template>
      </StudioRecentProjects>
    </div>

    <!-- 5-4. 이렇게 쓰세요 -->
    <section id="how" ref="howRef" class="scroll-mt-6">
      <h2 class="st-h-section mb-4">이렇게 쓰세요</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="(s, i) in STEPS" :key="s.title" class="st-card p-5">
          <div class="flex items-center gap-2.5">
            <span class="st-num">{{ i + 1 }}</span>
            <span class="st-icon-box"><component :is="s.icon" class="w-[18px] h-[18px]" :stroke-width="2" /></span>
          </div>
          <div class="st-h-card mt-4">{{ s.title }}</div>
          <p class="mt-1 st-desc">{{ s.desc }}</p>
        </div>
      </div>
    </section>

    <!-- 5-5. 이유씨 고객 혜택 -->
    <section class="st-accent-soft-bg rounded-[16px] px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <p class="flex-1 text-[15px] font-semibold st-ink">스튜디오는 이유씨컴퍼니 고객에게 무료예요. 만든 상품은 바로 이유씨로 사입할 수 있어요.</p>
      <router-link to="/mall" class="st-btn st-btn-lg shrink-0">이유씨몰 가기</router-link>
    </section>
  </div>
</template>

<script setup>
// 스튜디오 대문 — 로그인 없이 누구나 본다 (소개·새 소식·사용법). 작업은 /studio/projects에서.
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Image as ImageIcon, FolderUp, PenLine, Download } from 'lucide-vue-next'
import { currentUser, openLoginModal } from '@/lib/auth'
import { getStudioNotices } from '@/lib/studioNotices'
import StudioRecentProjects from '@/components/studio/StudioRecentProjects.vue'

const router = useRouter()
const notices = ref([])
const noticeError = ref('')
const recentCount = ref(0)
const howRef = ref(null)

const TYPE_LABEL = { update: '업데이트', notice: '공지', soon: '예정' }
const TYPE_CLASS = { update: 'st-badge-accent', notice: '', soon: 'st-badge-outline' }
const STEPS = [
  { title: '불러오기', desc: '찜·주문한 상품이나 내 사진', icon: FolderUp },
  { title: '편집하기', desc: '중국어는 지우고, 한글은 올리고', icon: PenLine },
  { title: '내보내기', desc: '쿠팡·자사몰용 이미지로', icon: Download },
]

/** 날짜가 7일 이내면 NEW */
function isNew(date) {
  if (!date) return false
  const days = (Date.now() - new Date(`${date}T00:00:00+09:00`).getTime()) / 86400000
  return days >= 0 && days <= 7
}

function scrollToHow() {
  howRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 로그인 안 했으면 기존 로그인 모달(App.vue AuthModal)을 열고, 로그인되면 내 작업으로 보낸다
let wantStart = false
function loginAndStart() {
  wantStart = true
  openLoginModal('login')
}
watch(currentUser, user => {
  if (user && wantStart) {
    wantStart = false
    router.push({ name: 'studio-projects' })
  }
})

// 로그아웃 구독 (CLAUDE.md 2-9) — 이 화면이 직접 가진 개인 데이터는 없다. 목록은 StudioRecentProjects가 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) {
    wantStart = false
    recentCount.value = 0
  }
}

onMounted(async () => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  try {
    notices.value = await getStudioNotices()
  } catch (e) {
    console.error('[StudioLanding] 새 소식 불러오기 실패:', e)
    noticeError.value = `새 소식을 불러오지 못했어요: ${e.message || e}`
  }
})
onUnmounted(() => window.removeEventListener('euchs-auth-changed', onStudioAuthChanged))
</script>
