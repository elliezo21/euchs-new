<template>
  <div class="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
    <!-- Card Container -->
    <div class="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-3xl p-8 border border-slate-800 shadow-2xl text-center space-y-6">
      
      <!-- Brand Logo -->
      <div class="flex justify-center">
        <img 
          src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/logo.png" 
          alt="이유씨 로고" 
          class="h-9 w-auto brightness-0 invert opacity-90"
        />
      </div>

      <!-- State: Loading -->
      <div v-if="status === 'loading'" class="space-y-4 py-4">
        <div class="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div class="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
          <span class="absolute font-black text-[#03C75A] text-lg">N</span>
        </div>
        <div class="space-y-1">
          <h2 class="text-lg font-black text-white">네이버 로그인 처리 중</h2>
          <p class="text-xs text-slate-400">네이버 계정 정보를 안전하게 인증하고 있습니다...</p>
        </div>
      </div>

      <!-- State: Success -->
      <div v-else-if="status === 'success'" class="space-y-4 py-4">
        <div class="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl border border-emerald-500/40">
          <i class="fas fa-check"></i>
        </div>
        <div class="space-y-1">
          <h2 class="text-lg font-black text-emerald-400">로그인 완료!</h2>
          <p class="text-xs text-slate-300">{{ userName }}님, 환영합니다.</p>
          <p class="text-[11px] text-slate-500">잠시 후 메인 화면으로 이동합니다...</p>
        </div>
      </div>

      <!-- State: Error -->
      <div v-else class="space-y-4 py-4">
        <div class="w-14 h-14 mx-auto rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-2xl border border-red-500/40">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="space-y-1.5">
          <h2 class="text-lg font-black text-red-400">로그인 실패</h2>
          <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{{ errorMessage }}</p>
        </div>
        <div class="pt-2 flex flex-col gap-2">
          <router-link 
            to="/" 
            class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg"
          >
            메인 페이지로 이동
          </router-link>
          <button 
            @click="retryLogin"
            class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
          >
            다시 시도하기
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { handleNaverCallback, signInWithNaver } from '../../lib/auth'

const router = useRouter()
const route = useRoute()

const status = ref('loading') // 'loading' | 'success' | 'error'
const errorMessage = ref('')
const userName = ref('')

const processCallback = async () => {
  const code = route.query.code
  const state = route.query.state
  const error = route.query.error
  const errorDescription = route.query.error_description

  if (error) {
    status.value = 'error'
    errorMessage.value = `네이버 로그인 거부 또는 취소: ${errorDescription || error}`
    return
  }

  if (!code || !state) {
    status.value = 'error'
    errorMessage.value = '인증 코드 또는 상태 값이 유효하지 않습니다.'
    return
  }

  try {
    const result = await handleNaverCallback(code, state)
    if (result.success) {
      status.value = 'success'
      userName.value = result.user?.user_metadata?.full_name || result.user?.email || '회원'
      setTimeout(() => {
        router.replace('/')
      }, 1200)
    } else {
      status.value = 'error'
      errorMessage.value = result.message || '네이버 로그인 처리에 실패했습니다.'
    }
  } catch (err) {
    console.error('Naver Callback Exception:', err)
    status.value = 'error'
    errorMessage.value = err.message || '서버와 통신 중 문제가 발생했습니다.'
  }
}

const retryLogin = () => {
  signInWithNaver()
}

onMounted(() => {
  processCallback()
})
</script>
