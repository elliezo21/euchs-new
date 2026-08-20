<template>
  <!-- Modal Teleport to Body -->
  <teleport to="body">
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div 
        v-if="isLoginModalOpen" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm select-none"
        @click.self="closeLoginModal"
        @keydown.esc="closeLoginModal"
      >
        <!-- Modal Card Container -->
        <div 
          class="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 overflow-hidden text-slate-800"
          role="dialog" 
          aria-modal="true"
        >
          <!-- Close Button (X) -->
          <button 
            type="button"
            @click="closeLoginModal"
            class="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition"
            aria-label="닫기"
          >
            <i class="fas fa-times text-sm"></i>
          </button>

          <!-- Top Brand Header -->
          <div class="text-center space-y-1.5 pb-5">
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">
              {{ modalTitle }}
            </h2>
            <p class="text-xs text-slate-500 font-normal">
              15년 노하우 신뢰의 중국 무역 파트너 <strong>EUC COMPANY</strong>
            </p>
          </div>

          <!-- ============================================ -->
          <!-- 1. LOGIN MODE FORM -->
          <!-- ============================================ -->
          <div v-if="loginModalMode === 'login'" class="space-y-4">
            <form @submit.prevent="handleEmailLogin" class="space-y-3" autocomplete="off">
              <!-- Hidden dummy inputs to trick browser autofill -->
              <input type="text" style="display:none" aria-hidden="true" autocomplete="off" />
              <input type="password" style="display:none" aria-hidden="true" autocomplete="new-password" />

              <!-- Email / ID Input -->
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">아이디 / 이메일</label>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    <i class="fas fa-envelope"></i>
                  </span>
                  <input 
                    v-model.trim="loginForm.email"
                    type="email" 
                    required
                    autocomplete="new-password"
                    placeholder="example@euchs.com" 
                    class="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                  />
                </div>
              </div>

              <!-- Password Input -->
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">비밀번호</label>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    <i class="fas fa-lock"></i>
                  </span>
                  <input 
                    v-model="loginForm.password"
                    :type="showPassword ? 'text' : 'password'" 
                    required
                    autocomplete="new-password"
                    placeholder="비밀번호를 입력하세요" 
                    class="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                  />
                  <button 
                    type="button" 
                    @click="showPassword = !showPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                  >
                    <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
              </div>

              <!-- Black Login Button -->
              <div class="pt-1">
                <button 
                  type="submit" 
                  :disabled="isLoading"
                  class="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md hover:shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <i v-if="isLoading" class="fas fa-spinner animate-spin text-sm"></i>
                  <span>로그인</span>
                </button>
              </div>
            </form>

            <!-- Bottom Links: 비밀번호 찾기 | 회원가입 -->
            <div class="flex items-center justify-center gap-3 text-xs text-slate-500 pt-1">
              <button 
                type="button" 
                @click="loginModalMode = 'forgot'"
                class="hover:text-blue-600 transition"
              >
                비밀번호 찾기
              </button>
              <span class="text-slate-300">|</span>
              <button 
                type="button" 
                @click="loginModalMode = 'signup'"
                class="hover:text-blue-600 font-bold text-slate-700 transition"
              >
                회원가입
              </button>
            </div>

            <!-- Divider -->
            <div class="relative flex py-2 items-center">
              <div class="flex-grow border-t border-slate-200"></div>
              <span class="flex-shrink mx-3 text-[11px] font-medium text-slate-400">또는 SNS 간편로그인</span>
              <div class="flex-grow border-t border-slate-200"></div>
            </div>

            <!-- ============================================ -->
            <!-- 3 SOCIAL LOGIN BUTTONS (Full Width Vertical) -->
            <!-- ============================================ -->
            <div class="space-y-2.5">
              
              <!-- 1. Kakao Yellow Button (#FEE500 / text-black) -->
              <button 
                type="button"
                @click="handleKakaoLogin"
                class="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 transition active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-sm hover:brightness-95 cursor-pointer"
                style="background-color: #FEE500;"
              >
                <i class="fas fa-comment text-amber-950 text-base"></i>
                <span>카카오로 시작하기</span>
              </button>

              <!-- 2. Naver Green Button (#03C75A / text-white) -->
              <button 
                type="button"
                @click="handleNaverLogin"
                class="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-sm hover:brightness-95 cursor-pointer"
                style="background-color: #03C75A;"
              >
                <span class="font-black text-sm tracking-tighter bg-white text-[#03C75A] w-4 h-4 rounded-sm flex items-center justify-center text-[10px]">N</span>
                <span>네이버 로그인</span>
              </button>

              <!-- 3. Google White / Border Button (border border-slate-300 / text-slate-700) -->
              <div id="google-login-btn" class="w-full flex justify-center min-h-[44px]">
                <button 
                  type="button"
                  @click="handleGoogleLogin"
                  class="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 transition active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>구글 계정으로 로그인</span>
                </button>
              </div>

            </div>
          </div>

          <!-- ============================================ -->
          <!-- 2. SIGNUP MODE FORM -->
          <!-- ============================================ -->
          <div v-else-if="loginModalMode === 'signup'" class="space-y-4">
            
            <!-- SNS Quick Signup Header & Buttons -->
            <div class="space-y-2.5">
              <div class="text-center pb-0.5">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                  <i class="fas fa-bolt text-amber-500"></i>
                  <span>SNS 3초 간편 회원가입</span>
                </span>
              </div>

              <!-- 1. Kakao Yellow Button (#FEE500 / text-black) -->
              <button 
                type="button"
                @click="handleKakaoLogin"
                class="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 transition active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-sm hover:brightness-95 cursor-pointer"
                style="background-color: #FEE500;"
              >
                <i class="fas fa-comment text-amber-950 text-base"></i>
                <span>카카오로 3초 만에 시작하기</span>
              </button>

              <!-- 2. Naver Green Button (#03C75A / text-white) -->
              <button 
                type="button"
                @click="handleNaverLogin"
                class="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-sm hover:brightness-95 cursor-pointer"
                style="background-color: #03C75A;"
              >
                <span class="font-black text-sm tracking-tighter bg-white text-[#03C75A] w-4 h-4 rounded-sm flex items-center justify-center text-[10px]">N</span>
                <span>네이버로 간편가입</span>
              </button>

              <!-- 3. Google White / Border Button -->
              <div id="google-signup-btn" class="w-full flex justify-center min-h-[44px]">
                <button 
                  type="button"
                  @click="handleGoogleLogin"
                  class="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 transition active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google 계정으로 가입하기</span>
                </button>
              </div>
            </div>

            <!-- Divider -->
            <div class="relative flex py-1.5 items-center">
              <div class="flex-grow border-t border-slate-200"></div>
              <span class="flex-shrink mx-3 text-[11px] font-medium text-slate-400">또는 이메일로 직접 가입하기</span>
              <div class="flex-grow border-t border-slate-200"></div>
            </div>

            <!-- Email Signup Form -->
            <form @submit.prevent="handleEmailSignup" class="space-y-3" autocomplete="off">
              <!-- Hidden dummy inputs to trick browser autofill -->
              <input type="text" style="display:none" aria-hidden="true" autocomplete="off" />
              <input type="password" style="display:none" aria-hidden="true" autocomplete="new-password" />

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">성명 / 닉네임</label>
                <input 
                  v-model.trim="signupForm.name"
                  type="text" 
                  required
                  autocomplete="off"
                  placeholder="홍길동" 
                  class="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">이메일 주소</label>
                <input 
                  v-model.trim="signupForm.email"
                  type="email" 
                  required
                  autocomplete="new-password"
                  placeholder="example@euchs.com" 
                  class="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">연락처 (휴대폰 번호)</label>
                <input 
                  v-model.trim="signupForm.phone"
                  type="tel" 
                  autocomplete="off"
                  placeholder="010-1234-5678" 
                  class="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">비밀번호 (6자 이상)</label>
                <div class="relative">
                  <input 
                    v-model="signupForm.password"
                    :type="showSignupPassword ? 'text' : 'password'" 
                    required
                    minlength="6"
                    autocomplete="new-password"
                    placeholder="비밀번호 설정 (6자 이상)" 
                    class="w-full pl-3.5 pr-10 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                  />
                  <button 
                    type="button" 
                    @click="showSignupPassword = !showSignupPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                  >
                    <i :class="showSignupPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">비밀번호 확인</label>
                <input 
                  v-model="signupForm.passwordConfirm"
                  type="password" 
                  required
                  minlength="6"
                  autocomplete="new-password"
                  placeholder="비밀번호를 한 번 더 입력하세요" 
                  class="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                />
              </div>

              <div class="pt-1">
                <button 
                  type="submit" 
                  :disabled="isLoading"
                  class="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <i v-if="isLoading" class="fas fa-spinner animate-spin text-sm"></i>
                  <span>이메일로 회원가입</span>
                </button>
              </div>
            </form>

            <div class="text-center pt-2">
              <button 
                type="button" 
                @click="loginModalMode = 'login'" 
                class="text-xs text-blue-600 hover:underline font-semibold"
              >
                &larr; 이미 계정이 있으신가요? 로그인하기
              </button>
            </div>
          </div>

          <!-- ============================================ -->
          <!-- 3. FORGOT PASSWORD MODE -->
          <!-- ============================================ -->
          <div v-else-if="loginModalMode === 'forgot'" class="space-y-4">
            <p class="text-xs text-slate-600 leading-relaxed">
              가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
            </p>
            <form @submit.prevent="handleForgotPassword" class="space-y-3" autocomplete="off">
              <!-- Hidden dummy inputs to trick browser autofill -->
              <input type="text" style="display:none" aria-hidden="true" autocomplete="off" />
              <input type="password" style="display:none" aria-hidden="true" autocomplete="new-password" />

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">이메일 주소</label>
                <input 
                  v-model.trim="forgotEmail"
                  type="email" 
                  required
                  autocomplete="off"
                  placeholder="example@euchs.com" 
                  class="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                />
              </div>

              <div class="pt-1">
                <button 
                  type="submit" 
                  :disabled="isLoading"
                  class="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <i v-if="isLoading" class="fas fa-spinner animate-spin text-sm"></i>
                  <span>재설정 링크 발송</span>
                </button>
              </div>
            </form>

            <div class="text-center pt-2">
              <button 
                type="button" 
                @click="loginModalMode = 'login'" 
                class="text-xs text-blue-600 hover:underline font-semibold"
              >
                &larr; 로그인 화면으로 돌아가기
              </button>
            </div>
          </div>

        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import {
  isLoginModalOpen,
  loginModalMode,
  closeLoginModal,
  signInWithGoogle,
  signInWithKakao,
  signInWithNaver,
  signInWithEmail,
  signUpWithEmail,
  resetPasswordForEmail,
  renderGoogleButton
} from '../lib/auth'

const isLoading = ref(false)
const showPassword = ref(false)
const showSignupPassword = ref(false)
const forgotEmail = ref('')

const loginForm = ref({
  email: '',
  password: ''
})

const signupForm = ref({
  name: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirm: ''
})

const modalTitle = computed(() => {
  if (loginModalMode.value === 'signup') return '회원가입'
  if (loginModalMode.value === 'forgot') return '비밀번호 찾기'
  return '로그인'
})

const forceClearDomInputs = () => {
  if (typeof document !== 'undefined') {
    const inputs = document.querySelectorAll('input:not([type="hidden"])')
    inputs.forEach(input => {
      if (input.type === 'email' || input.type === 'password' || input.type === 'text') {
        input.value = ''
      }
    })
  }
}

const mountGoogleGsiButtons = async () => {
  await nextTick()
  if (!isLoginModalOpen.value) return
  if (loginModalMode.value === 'login') {
    renderGoogleButton('google-login-btn', { mode: 'login' })
  } else if (loginModalMode.value === 'signup') {
    renderGoogleButton('google-signup-btn', { mode: 'signup' })
  }
}

const resetAllForms = () => {
  loginForm.value = {
    email: '',
    password: ''
  }
  signupForm.value = {
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: ''
  }
  forgotEmail.value = ''
  showPassword.value = false
  showSignupPassword.value = false

  nextTick(() => {
    forceClearDomInputs()
  })
  setTimeout(() => {
    forceClearDomInputs()
  }, 50)
  setTimeout(() => {
    forceClearDomInputs()
  }, 200)
}

watch(isLoginModalOpen, (isOpen) => {
  if (isOpen) {
    resetAllForms()
    setTimeout(mountGoogleGsiButtons, 80)
  }
})

watch(loginModalMode, () => {
  resetAllForms()
  setTimeout(mountGoogleGsiButtons, 80)
})

onMounted(() => {
  resetAllForms()
})

const handleGoogleLogin = async () => {
  await signInWithGoogle()
}

const handleKakaoLogin = async () => {
  await signInWithKakao()
}

const handleNaverLogin = async () => {
  signInWithNaver()
}

const handleEmailLogin = async () => {
  if (!loginForm.value.email || !loginForm.value.password) return
  isLoading.value = true
  try {
    await signInWithEmail(loginForm.value.email, loginForm.value.password)
    alert('성공적으로 로그인되었습니다.')
    resetAllForms()
  } catch (err) {
    console.error('Email login error:', err)
    alert(`로그인 실패: ${err.message || '아이디 또는 비밀번호를 확인해 주세요.'}`)
  } finally {
    isLoading.value = false
  }
}

const handleEmailSignup = async () => {
  if (!signupForm.value.name || !signupForm.value.email || !signupForm.value.password) {
    alert('성명, 이메일, 비밀번호를 모두 입력해 주세요.')
    return
  }

  if (signupForm.value.password.length < 6) {
    alert('비밀번호는 최소 6자 이상이어야 합니다.')
    return
  }

  if (signupForm.value.password !== signupForm.value.passwordConfirm) {
    alert('비밀번호와 비밀번호 확인이 일치하지 않습니다. 다시 확인해 주세요.')
    return
  }

  isLoading.value = true
  try {
    await signUpWithEmail(
      signupForm.value.email,
      signupForm.value.password,
      signupForm.value.name,
      signupForm.value.phone
    )
    alert('회원가입 신청이 완료되었습니다! 이메일 인증 후 로그인하실 수 있습니다.')
    loginModalMode.value = 'login'
    resetAllForms()
  } catch (err) {
    console.error('Email signup error:', err)
    alert(`회원가입 실패: ${err.message || '입력 정보를 다시 확인해 주세요.'}`)
  } finally {
    isLoading.value = false
  }
}

const handleForgotPassword = async () => {
  if (!forgotEmail.value) return
  isLoading.value = true
  try {
    await resetPasswordForEmail(forgotEmail.value)
    alert('비밀번호 재설정 메일이 발송되었습니다. 메일함을 확인해 주세요.')
    loginModalMode.value = 'login'
    forgotEmail.value = ''
  } catch (err) {
    console.error('Forgot password error:', err)
    alert(`발송 실패: ${err.message || '이메일 주소를 다시 확인해 주세요.'}`)
  } finally {
    isLoading.value = false
  }
}
</script>
