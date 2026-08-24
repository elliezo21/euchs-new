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
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm select-none overflow-y-auto"
        @click.self="closeLoginModal"
        @keydown.esc="closeLoginModal"
      >
        <!-- Modal Card Container -->
        <div 
          class="relative w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8 text-slate-800 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar transition-all"
          :class="(loginModalMode === 'signup' || loginModalMode === 'business_verify') ? 'max-w-[480px]' : 'max-w-[420px]'"
          role="dialog" 
          aria-modal="true"
        >
          <!-- Close Button (X) -->
          <button 
            type="button"
            @click="closeLoginModal"
            class="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition cursor-pointer"
            aria-label="닫기"
          >
            <i class="fas fa-times text-sm"></i>
          </button>

          <!-- Top Brand Header -->
          <div class="text-center space-y-1.5 pb-5">
            <span v-if="loginModalMode === 'business_verify'" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
              <i class="fas fa-shield-alt text-amber-600"></i> B2B 바이어 필수 인증
            </span>
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">
              {{ modalTitle }}
            </h2>
            <p class="text-xs text-slate-500 font-normal leading-relaxed">
              {{ modalSubtitle }}
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
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
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
                  class="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md hover:shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                class="hover:text-blue-600 transition cursor-pointer"
              >
                비밀번호 찾기
              </button>
              <span class="text-slate-300">|</span>
              <button 
                type="button" 
                @click="loginModalMode = 'signup'"
                class="hover:text-blue-600 font-bold text-slate-700 transition cursor-pointer"
              >
                사업자 회원가입
              </button>
            </div>

            <!-- Divider -->
            <div class="relative flex py-2 items-center">
              <div class="flex-grow border-t border-slate-200"></div>
              <span class="flex-shrink mx-3 text-[11px] font-medium text-slate-400">또는 SNS 간편로그인</span>
              <div class="flex-grow border-t border-slate-200"></div>
            </div>

            <!-- 3 SOCIAL LOGIN BUTTONS -->
            <div class="space-y-2.5">
              <!-- 1. Kakao Yellow Button -->
              <button 
                type="button"
                @click="handleKakaoLogin"
                class="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 transition active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-sm hover:brightness-95 cursor-pointer"
                style="background-color: #FEE500;"
              >
                <i class="fas fa-comment text-amber-950 text-base"></i>
                <span>카카오로 시작하기</span>
              </button>

              <!-- 2. Naver Green Button -->
              <button 
                type="button"
                @click="handleNaverLogin"
                class="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-sm hover:brightness-95 cursor-pointer"
                style="background-color: #03C75A;"
              >
                <span class="font-black text-sm tracking-tighter bg-white text-[#03C75A] w-4 h-4 rounded-sm flex items-center justify-center text-[10px]">N</span>
                <span>네이버 로그인</span>
              </button>

              <!-- 3. Google Button -->
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
          <!-- 2. B2B SIGNUP MODE FORM (with Business Fields) -->
          <!-- ============================================ -->
          <div v-else-if="loginModalMode === 'signup'" class="space-y-4">
            
            <!-- SNS Quick Signup Header & Buttons -->
            <div class="space-y-2">
              <div class="text-center pb-0.5">
                <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold">
                  <i class="fas fa-bolt text-amber-500"></i>
                  <span>SNS 3초 간편 회원가입</span>
                </span>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <!-- 1. Kakao -->
                <button 
                  type="button"
                  @click="handleKakaoLogin"
                  class="py-2.5 px-2 rounded-xl font-bold text-xs text-slate-950 transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-2xs hover:brightness-95 cursor-pointer"
                  style="background-color: #FEE500;"
                  title="카카오로 3초 간편가입"
                >
                  <i class="fas fa-comment text-amber-950 text-xs"></i>
                  <span>카카오</span>
                </button>

                <!-- 2. Naver -->
                <button 
                  type="button"
                  @click="handleNaverLogin"
                  class="py-2.5 px-2 rounded-xl font-bold text-xs text-white transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-2xs hover:brightness-95 cursor-pointer"
                  style="background-color: #03C75A;"
                  title="네이버로 간편가입"
                >
                  <span class="font-black text-[11px] bg-white text-[#03C75A] w-3.5 h-3.5 rounded-xs flex items-center justify-center">N</span>
                  <span>네이버</span>
                </button>

                <!-- 3. Google -->
                <button 
                  type="button"
                  @click="handleGoogleLogin"
                  class="py-2.5 px-2 rounded-xl font-bold text-xs bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  title="구글 계정으로 간편가입"
                >
                  <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>구글</span>
                </button>
              </div>
            </div>

            <!-- Divider -->
            <div class="relative flex py-1 items-center">
              <div class="flex-grow border-t border-slate-200"></div>
              <span class="flex-shrink mx-3 text-[11px] font-bold text-slate-500">B2B 사업자 직접 가입</span>
              <div class="flex-grow border-t border-slate-200"></div>
            </div>

            <!-- Email & Business Signup Form -->
            <form @submit.prevent="handleEmailSignup" class="space-y-3.5" autocomplete="off">
              <input type="text" style="display:none" aria-hidden="true" autocomplete="off" />
              <input type="password" style="display:none" aria-hidden="true" autocomplete="new-password" />

              <!-- [섹션 1: 계정 정보] -->
              <div class="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div class="flex items-center gap-1.5 text-xs font-black text-slate-900 pb-1 border-b border-slate-200/80">
                  <i class="fas fa-user-lock text-blue-600"></i>
                  <span>1. 로그인 계정 정보</span>
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-700 mb-1">아이디 (이메일 주소) *</label>
                  <input 
                    v-model.trim="signupForm.email"
                    type="email" 
                    required
                    autocomplete="new-password"
                    placeholder="example@euchs.com" 
                    class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                  />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">비밀번호 (6자 이상) *</label>
                    <input 
                      v-model="signupForm.password"
                      type="password" 
                      required
                      minlength="6"
                      autocomplete="new-password"
                      placeholder="6자 이상 입력" 
                      class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">비밀번호 확인 *</label>
                    <input 
                      v-model="signupForm.passwordConfirm"
                      type="password" 
                      required
                      minlength="6"
                      autocomplete="new-password"
                      placeholder="비밀번호 재확인" 
                      class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                    />
                  </div>
                </div>
              </div>

              <!-- [섹션 2: B2B 사업자 & 통관 필수 정보] -->
              <div class="space-y-2.5 bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200">
                <div class="flex items-center justify-between pb-1 border-b border-blue-200/80">
                  <div class="flex items-center gap-1.5 text-xs font-black text-blue-950">
                    <i class="fas fa-building text-blue-600"></i>
                    <span>2. B2B 사업자 & 통관 정보 (필수)</span>
                  </div>
                  <span class="text-[10px] text-blue-700 font-bold">도매가 열람 필수</span>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">상호명 (회사명) *</label>
                    <input 
                      v-model.trim="signupForm.company_name"
                      type="text" 
                      required
                      placeholder="(주)이유씨글로벌" 
                      class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition font-medium"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">대표자명 / 담당자 *</label>
                    <input 
                      v-model.trim="signupForm.name"
                      type="text" 
                      required
                      placeholder="홍길동" 
                      class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">
                      사업자등록번호 (10자리) *
                    </label>
                    <input 
                      v-model="signupForm.business_number"
                      @input="formatSignupBizNumber"
                      type="text" 
                      required
                      maxlength="12"
                      placeholder="123-45-67890" 
                      class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">
                      통관고유부호 (PCCC) *
                    </label>
                    <input 
                      v-model.trim="signupForm.pccc"
                      @input="signupForm.pccc = signupForm.pccc.toUpperCase()"
                      type="text" 
                      required
                      maxlength="13"
                      placeholder="P240012345678" 
                      class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition font-mono font-bold text-blue-700 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-700 mb-1">사업장 소재지 (배송지 주소) *</label>
                  <input 
                    v-model.trim="signupForm.address"
                    type="text" 
                    required
                    placeholder="서울특별시 강남구 테헤란로 123 4층" 
                    class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition"
                  />
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-700 mb-1">담당자 연락처 (휴대폰) *</label>
                  <input 
                    v-model.trim="signupForm.phone"
                    type="tel" 
                    required
                    placeholder="010-1234-5678" 
                    class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-900 transition font-mono"
                  />
                </div>
              </div>

              <!-- Submit Button -->
              <div class="pt-1">
                <button 
                  type="submit" 
                  :disabled="isLoading"
                  class="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <i v-if="isLoading" class="fas fa-spinner animate-spin text-sm"></i>
                  <span>B2B 사업자 회원가입 완료</span>
                </button>
              </div>
            </form>

            <div class="text-center pt-1">
              <button 
                type="button" 
                @click="loginModalMode = 'login'" 
                class="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                &larr; 이미 계정이 있으신가요? 로그인하기
              </button>
            </div>
          </div>

          <!-- ============================================ -->
          <!-- 3. BUSINESS VERIFICATION ONLY MODE (For SNS Users) -->
          <!-- ============================================ -->
          <div v-else-if="loginModalMode === 'business_verify'" class="space-y-4">
            <div class="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p class="font-bold flex items-center gap-1.5 text-amber-950">
                <i class="fas fa-exclamation-triangle text-amber-600"></i>
                <span>사업자 정보 등록이 필요합니다</span>
              </p>
              <p class="text-[11px] text-amber-800 leading-snug">
                EUCHS는 B2B 수입 도매 전문 플랫폼으로, 실시간 1688 도매가 열람 및 발주를 위해 필수 사업자 정보를 등록해 주셔야 합니다.
              </p>
            </div>

            <form @submit.prevent="handleBusinessVerifySubmit" class="space-y-3" autocomplete="off">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">상호명 (회사명) *</label>
                  <input 
                    v-model.trim="verifyForm.company_name"
                    type="text" 
                    required
                    placeholder="(주)이유씨글로벌" 
                    class="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-xs text-slate-900 transition font-medium"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">대표자명 / 담당자 *</label>
                  <input 
                    v-model.trim="verifyForm.name"
                    type="text" 
                    required
                    placeholder="홍길동" 
                    class="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-xs text-slate-900 transition"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">사업자등록번호 (10자리) *</label>
                  <input 
                    v-model="verifyForm.business_number"
                    @input="formatVerifyBizNumber"
                    type="text" 
                    required
                    maxlength="12"
                    placeholder="123-45-67890" 
                    class="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-xs text-slate-900 transition font-mono font-bold"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">통관고유부호 (PCCC) *</label>
                  <input 
                    v-model.trim="verifyForm.pccc"
                    @input="verifyForm.pccc = verifyForm.pccc.toUpperCase()"
                    type="text" 
                    required
                    maxlength="13"
                    placeholder="P240012345678" 
                    class="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-xs text-slate-900 transition font-mono font-bold text-indigo-700 uppercase"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">사업장 소재지 (수령 배송지) *</label>
                <input 
                  v-model.trim="verifyForm.address"
                  type="text" 
                  required
                  placeholder="서울특별시 강남구 테헤란로 123 4층" 
                  class="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-xs text-slate-900 transition"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">담당자 연락처 (휴대폰) *</label>
                <input 
                  v-model.trim="verifyForm.phone"
                  type="tel" 
                  required
                  placeholder="010-1234-5678" 
                  class="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none text-xs text-slate-900 transition font-mono"
                />
              </div>

              <div class="pt-2">
                <button 
                  type="submit" 
                  :disabled="isLoading"
                  class="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <i v-if="isLoading" class="fas fa-spinner animate-spin text-sm"></i>
                  <span>사업자 인증 및 정보 등록 완료</span>
                </button>
              </div>
            </form>
          </div>

          <!-- ============================================ -->
          <!-- 4. FORGOT PASSWORD MODE -->
          <!-- ============================================ -->
          <div v-else-if="loginModalMode === 'forgot'" class="space-y-4">
            <p class="text-xs text-slate-600 leading-relaxed">
              가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
            </p>
            <form @submit.prevent="handleForgotPassword" class="space-y-3" autocomplete="off">
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
                  class="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                class="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
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
  currentUser,
  getUserBusinessInfo,
  signInWithGoogle,
  signInWithKakao,
  signInWithNaver,
  signInWithEmail,
  signUpWithEmail,
  updateBusinessProfile,
  resetPasswordForEmail,
  renderGoogleButton
} from '../lib/auth'

const isLoading = ref(false)
const showPassword = ref(false)
const forgotEmail = ref('')

const loginForm = ref({
  email: '',
  password: ''
})

const signupForm = ref({
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
  company_name: '',
  business_number: '',
  pccc: '',
  address: '',
  phone: ''
})

const verifyForm = ref({
  name: '',
  company_name: '',
  business_number: '',
  pccc: '',
  address: '',
  phone: ''
})

const modalTitle = computed(() => {
  if (loginModalMode.value === 'signup') return 'B2B 사업자 회원가입'
  if (loginModalMode.value === 'business_verify') return 'B2B 사업자 정보 등록'
  if (loginModalMode.value === 'forgot') return '비밀번호 찾기'
  return '로그인'
})

const modalSubtitle = computed(() => {
  if (loginModalMode.value === 'signup') return '중국 1688 실시간 도매 소싱 및 B2B 수입대행 전용 회원가입'
  if (loginModalMode.value === 'business_verify') return '사업자 전용 B2B 폐쇄몰입니다. 원활한 도매 소싱을 위해 사업자정보를 입력해 주세요.'
  if (loginModalMode.value === 'forgot') return '가입하신 이메일로 비밀번호 재설정 링크를 보내드립니다.'
  return '15년 노하우 신뢰의 중국 무역 파트너 EUC COMPANY'
})

// Auto-formatting helpers
const formatBizNumberString = (val) => {
  const clean = (val || '').replace(/[^0-9]/g, '').slice(0, 10)
  if (clean.length <= 3) return clean
  if (clean.length <= 5) return `${clean.slice(0, 3)}-${clean.slice(3)}`
  return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5)}`
}

const formatSignupBizNumber = () => {
  signupForm.value.business_number = formatBizNumberString(signupForm.value.business_number)
}

const formatVerifyBizNumber = () => {
  verifyForm.value.business_number = formatBizNumberString(verifyForm.value.business_number)
}

const validatePcccCode = (code) => {
  const clean = (code || '').trim().toUpperCase()
  return /^[PU][0-9]{12}$/.test(clean)
}

const mountGoogleGsiButtons = async () => {
  await nextTick()
  if (!isLoginModalOpen.value) return
  if (loginModalMode.value === 'login') {
    renderGoogleButton('google-login-btn', { mode: 'login' })
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
    password: '',
    passwordConfirm: '',
    company_name: '',
    business_number: '',
    pccc: '',
    address: '',
    phone: ''
  }
  
  const existingBiz = getUserBusinessInfo(currentUser.value)
  verifyForm.value = {
    name: existingBiz?.name || currentUser.value?.user_metadata?.full_name || '',
    company_name: existingBiz?.company_name || '',
    business_number: existingBiz?.business_number ? formatBizNumberString(existingBiz.business_number) : '',
    pccc: existingBiz?.pccc || '',
    address: existingBiz?.address || '',
    phone: existingBiz?.phone || ''
  }

  forgotEmail.value = ''
  showPassword.value = false
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
  // 1. 기본 유효성 검사
  if (!signupForm.value.email || !signupForm.value.password) {
    alert('이메일과 비밀번호를 입력해 주세요.')
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

  // 2. 사업자 정보 유효성 검사
  const cleanBiz = (signupForm.value.business_number || '').replace(/[^0-9]/g, '')
  if (cleanBiz.length !== 10) {
    alert('올바른 10자리 사업자등록번호를 입력해 주세요.')
    return
  }

  const cleanPccc = (signupForm.value.pccc || '').trim().toUpperCase()
  if (!validatePcccCode(cleanPccc)) {
    alert('통관고유부호는 P 또는 U로 시작하는 13자리여야 합니다. (예: P240012345678)')
    return
  }

  if (!signupForm.value.company_name.trim() || !signupForm.value.address.trim() || !signupForm.value.phone.trim()) {
    alert('상호명, 사업장 주소, 담당자 연락처를 모두 입력해 주세요.')
    return
  }

  isLoading.value = true
  try {
    await signUpWithEmail(
      signupForm.value.email,
      signupForm.value.password,
      {
        name: signupForm.value.name,
        company_name: signupForm.value.company_name,
        business_number: cleanBiz,
        pccc: cleanPccc,
        address: signupForm.value.address,
        phone: signupForm.value.phone
      }
    )
    alert('🎉 B2B 사업자 회원가입이 완료되었습니다!\n확인 이메일을 인증하신 후 로그인해 주세요.')
    loginModalMode.value = 'login'
    resetAllForms()
  } catch (err) {
    console.error('Email signup error:', err)
    alert(`회원가입 실패: ${err.message || '입력 정보를 다시 확인해 주세요.'}`)
  } finally {
    isLoading.value = false
  }
}

const handleBusinessVerifySubmit = async () => {
  const cleanBiz = (verifyForm.value.business_number || '').replace(/[^0-9]/g, '')
  if (cleanBiz.length !== 10) {
    alert('올바른 10자리 사업자등록번호를 입력해 주세요.')
    return
  }

  const cleanPccc = (verifyForm.value.pccc || '').trim().toUpperCase()
  if (!validatePcccCode(cleanPccc)) {
    alert('통관고유부호는 P 또는 U로 시작하는 13자리여야 합니다. (예: P240012345678)')
    return
  }

  if (!verifyForm.value.company_name.trim() || !verifyForm.value.address.trim() || !verifyForm.value.phone.trim()) {
    alert('상호명, 사업장 주소, 담당자 연락처를 모두 입력해 주세요.')
    return
  }

  isLoading.value = true
  try {
    await updateBusinessProfile({
      name: verifyForm.value.name,
      company_name: verifyForm.value.company_name,
      business_number: cleanBiz,
      pccc: cleanPccc,
      address: verifyForm.value.address,
      phone: verifyForm.value.phone
    })
    alert('✅ B2B 사업자 인증 및 정보 등록이 완료되었습니다!\n이제 1688 도매 소싱몰을 자유롭게 이용하실 수 있습니다.')
    closeLoginModal()
  } catch (err) {
    console.error('Business verify error:', err)
    alert(`등록 실패: ${err.message || '잠시 후 다시 시도해 주세요.'}`)
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
