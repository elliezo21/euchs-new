<template>
  <div class="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
    <!-- Background visual elements -->
    <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>
    <div class="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Login Container -->
    <div class="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 space-y-8">
      
      <!-- Top Brand Area -->
      <div class="text-center space-y-3">
        <div class="flex justify-center">
          <router-link to="/" class="inline-block hover:opacity-90 transition">
            <img 
              src="https://ecimg.cafe24img.com/pg164b02477358068/elliezo26/web/upload/img/logo.png" 
              alt="EUC COMPANY" 
              class="h-9 w-auto brightness-0 invert opacity-90 mx-auto"
            />
          </router-link>
        </div>

        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-mono font-bold tracking-wider uppercase">
          <i class="fas fa-lock text-blue-400"></i>
          <span>ADMINISTRATION CONSOLE</span>
        </div>

        <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">
          관리자 및 직원 전용 로그인
        </h1>
        <p class="text-xs text-slate-400">
          시스템 인가 권한(Admin/Staff)이 부여된 계정으로만 접근 가능합니다.
        </p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMessage" class="p-3.5 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5 animate-shake">
        <i class="fas fa-circle-exclamation text-red-400 mt-0.5 shrink-0 text-sm"></i>
        <div class="space-y-0.5">
          <strong class="font-bold block">로그인 실패</strong>
          <p class="leading-relaxed opacity-90">{{ errorMessage }}</p>
        </div>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleAdminLogin" class="space-y-4" autocomplete="on">
        
        <!-- Email Input -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-300">관리자 이메일 계정</label>
          <div class="relative">
            <input 
              v-model.trim="loginForm.email"
              type="email" 
              required
              autocomplete="username"
              placeholder="admin@euccompany.com"
              class="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-white placeholder-slate-600 outline-none transition"
            />
            <i class="fas fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
          </div>
        </div>

        <!-- Password Input -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <label class="font-bold text-slate-300">비밀번호</label>
          </div>
          <div class="relative">
            <input 
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'" 
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-white placeholder-slate-600 outline-none transition"
            />
            <i class="fas fa-key absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <button 
              type="button" 
              @click="showPassword = !showPassword"
              class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              tabindex="-1"
            >
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" class="text-xs"></i>
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <i v-if="isLoading" class="fas fa-spinner animate-spin"></i>
            <i v-else class="fas fa-arrow-right-to-bracket"></i>
            <span>{{ isLoading ? '권한 검증 및 로그인 중...' : '관리자 콘솔 접속' }}</span>
          </button>
        </div>

      </form>

      <!-- Footer Info -->
      <div class="pt-4 border-t border-slate-800/80 text-center space-y-3">
        <div class="text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <i class="fas fa-shield-check text-emerald-400"></i>
          <span>Row Level Security & Role-Based Access Control</span>
        </div>
        
        <div>
          <router-link 
            to="/" 
            class="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <i class="fas fa-arrow-left text-[10px]"></i>
            <span>EUC COMPANY 메인 홈페이지로 이동</span>
          </router-link>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { adminSignIn } from '@/lib/auth'

const router = useRouter()
const route = useRoute()

const loginForm = ref({
  email: '',
  password: ''
})

const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

onMounted(() => {
  loginForm.value = {
    email: '',
    password: ''
  }
  showPassword.value = false
  errorMessage.value = ''
})

const handleAdminLogin = async () => {
  if (!loginForm.value.email || !loginForm.value.password) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await adminSignIn(loginForm.value.email, loginForm.value.password)
    if (result.success) {
      const redirectPath = route.query.redirect || '/admin'
      router.replace(redirectPath)
    }
  } catch (err) {
    console.error('Admin login failed:', err)
    errorMessage.value = err.message || '관리자 계정 정보가 일치하지 않거나 접근 권한이 없습니다.'
  } finally {
    isLoading.value = false
  }
}
</script>
