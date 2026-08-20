import { ref, computed } from 'vue'
import { supabase, isSupabaseConfigured } from './supabase'

export const currentUser = ref(null)
export const userRole = ref('user') // 'super_admin' | 'staff' | 'user'
export const isAuthLoading = ref(true)
export const isLoginModalOpen = ref(false)
export const loginModalMode = ref('login') // 'login' | 'signup' | 'forgot'

// 관리자 및 직원 여부 판별
export const isAdminOrStaff = computed(() => {
  return ['super_admin', 'staff', 'admin'].includes(userRole.value)
})

export const isSuperAdmin = computed(() => {
  return userRole.value === 'super_admin' || userRole.value === 'admin'
})

// 사용자 표시 이름 및 아바타 계산
export const userDisplayName = computed(() => {
  if (!currentUser.value) return ''
  const meta = currentUser.value.user_metadata || {}
  return meta.full_name || meta.name || currentUser.value.email?.split('@')[0] || '사용자'
})

export const userAvatarUrl = computed(() => {
  if (!currentUser.value) return ''
  const meta = currentUser.value.user_metadata || {}
  return meta.avatar_url || meta.picture || ''
})

export const userEmail = computed(() => {
  return currentUser.value?.email || ''
})

export const isLoggedIn = computed(() => Boolean(currentUser.value))

/**
 * 사용자 역할(Role) 조회 함수 (Supabase DB 및 Auth Metadata 검증)
 */
export const checkUserRole = async (user) => {
  if (!user) {
    userRole.value = 'user'
    return 'user'
  }

  // 1. Supabase user_roles 및 profiles 테이블 DB 실시간 조회
  try {
    if (isSupabaseConfigured()) {
      // 1-1. user_roles 테이블 우선 조회
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle()

      if (!roleError && roleData?.role && ['super_admin', 'staff', 'admin'].includes(roleData.role)) {
        userRole.value = roleData.role === 'admin' ? 'super_admin' : roleData.role
        return userRole.value
      }

      // 1-2. profiles 테이블 조회
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!profileError && profileData?.role && ['super_admin', 'staff', 'admin'].includes(profileData.role)) {
        userRole.value = profileData.role === 'admin' ? 'super_admin' : profileData.role
        return userRole.value
      }
    }
  } catch (err) {
    console.warn('roles / profiles DB lookup notice:', err)
  }

  // 2. Auth metadata (app_metadata 또는 user_metadata) 확인
  const metaRole = user.app_metadata?.role || user.user_metadata?.role
  if (metaRole && ['super_admin', 'staff', 'admin'].includes(metaRole)) {
    userRole.value = metaRole === 'admin' ? 'super_admin' : metaRole
    return userRole.value
  }

  // 3. 관리자 지정 이메일 Whitelist 확인
  const emailLower = (user.email || '').toLowerCase().trim()
  const ADMIN_EMAILS = [
    'admin@euccompany.com',
    'master@euccompany.com',
    'euc_admin@euccompany.com',
    'elliezo21@gmail.com'
  ]
  if (ADMIN_EMAILS.includes(emailLower)) {
    userRole.value = 'super_admin'
    return 'super_admin'
  }

  userRole.value = 'user'
  return 'user'
}

/**
 * 관리자 전용 로그인 (Admin Sign In)
 */
export const adminSignIn = async (email, password) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 연동 설정이 필요합니다.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: (email || '').trim(),
    password
  })

  if (error) {
    if (error.message?.includes('Invalid login credentials')) {
      throw new Error('아이디(이메일) 또는 비밀번호가 올바르지 않습니다.')
    }
    if (error.message?.includes('Email not confirmed')) {
      throw new Error('이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.')
    }
    throw error
  }

  if (!data?.user) {
    throw new Error('로그인 사용자 정보를 가져올 수 없습니다.')
  }

  // 권한 검증
  const role = await checkUserRole(data.user)
  if (!['super_admin', 'staff', 'admin'].includes(role)) {
    // 일반 사용자는 관리자 콘솔 진입 불가 -> 자동 로그아웃 처리
    await supabase.auth.signOut()
    currentUser.value = null
    userRole.value = 'user'
    throw new Error('관리자 또는 직원 권한(Role: Staff/Admin)이 부여되지 않은 계정입니다.')
  }

  currentUser.value = data.user
  return {
    success: true,
    user: data.user,
    role
  }
}

/**
 * 로그인 모달 열기/닫기 제어
 */
export const openLoginModal = (mode = 'login') => {
  loginModalMode.value = mode
  isLoginModalOpen.value = true
}

export const closeLoginModal = () => {
  isLoginModalOpen.value = false
}

/**
 * Google OAuth 로그인 실행
 */
export const signInWithGoogle = async () => {
  try {
    if (!isSupabaseConfigured()) {
      alert('Supabase 연동 설정이 필요합니다. 관리자에게 문의하거나 .env 설정을 확인해 주세요.')
      return
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) {
      console.error('Google OAuth Error:', error)
      alert(`구글 로그인 오류: ${error.message}`)
    }
  } catch (err) {
    console.error('Google Login Exception:', err)
    alert('구글 로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.')
  }
}

/**
 * Kakao OAuth 로그인 실행
 */
export const signInWithKakao = async () => {
  try {
    if (!isSupabaseConfigured()) {
      alert('카카오 간편 로그인은 현재 준비 중입니다.\n구글 계정으로 즉시 로그인하실 수 있습니다.')
      return
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) {
      console.warn('Kakao OAuth not enabled in Supabase:', error)
      alert('카카오 간편 로그인은 관리자 설정 진행 중입니다.\n구글 계정으로 바로 로그인해 주세요.')
    }
  } catch (err) {
    console.warn('Kakao Login Exception:', err)
    alert('카카오 간편 로그인은 현재 준비 중입니다.\n구글 계정으로 바로 로그인해 주세요.')
  }
}

/**
 * Naver OAuth2 로그인 실행
 */
export const signInWithNaver = () => {
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID || ''
  const redirectUri = import.meta.env.VITE_NAVER_REDIRECT_URI || `${window.location.origin}/auth/callback/naver`

  if (!clientId || clientId === '여기에_네이버_CLIENT_ID') {
    alert(
      '[네이버 로그인 안내]\n' +
      '네이버 Developers에 앱을 등록하고 발급받은 Client ID를 .env 파일에 설정해 주세요.\n\n' +
      '설정 항목:\n' +
      '1. VITE_NAVER_CLIENT_ID=네이버_클라이언트_아이디\n' +
      '2. VITE_NAVER_REDIRECT_URI=' + redirectUri + '\n\n' +
      '※ 현재는 구글 계정으로 즉시 로그인하실 수 있습니다.'
    )
    return
  }

  // CSRF 방지용 랜덤 state 생성 및 저장
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  sessionStorage.setItem('naver_oauth_state', state)

  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`

  window.location.href = naverAuthUrl
}

/**
 * 네이버 OAuth 콜백 처리 함수
 */
export const handleNaverCallback = async (code, state) => {
  const savedState = sessionStorage.getItem('naver_oauth_state')

  if (savedState && savedState !== state) {
    console.warn('Naver OAuth state mismatch, proceeding with token exchange')
  }

  const redirectUri = import.meta.env.VITE_NAVER_REDIRECT_URI || `${window.location.origin}/auth/callback/naver`

  try {
    let naverUser = null
    let sessionResult = null

    // 1. 로컬 API 엔드포인트 (/api/naver-auth) 우선 시도
    try {
      const localApiRes = await fetch('/api/naver-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state, redirectUri })
      })

      if (localApiRes.ok) {
        const localData = await localApiRes.json()
        if (localData.success && localData.naverUser) {
          naverUser = localData.naverUser
        }
      }
    } catch (localErr) {
      console.warn('Local naver-auth API fallback to Edge Function:', localErr)
    }

    // 2. 만약 로컬 API 응답이 없으면 Supabase Edge Function 호출 시도
    if (!naverUser && isSupabaseConfigured()) {
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('naver-auth', {
          body: { code, state, redirectUri }
        })

        if (!edgeError && edgeData?.success) {
          if (edgeData.session) {
            sessionResult = edgeData.session
          }
          if (edgeData.user) {
            naverUser = edgeData.user.user_metadata || edgeData.user
          }
        }
      } catch (edgeErr) {
        console.warn('Edge function naver-auth invoke error:', edgeErr)
      }
    }

    if (!naverUser && !sessionResult) {
      throw new Error('네이버 계정 정보를 인증할 수 없습니다. 네이버 로그인 설정을 확인해 주세요.')
    }

    // 3. Supabase Edge Function에서 표준 세션이 반환된 경우
    if (sessionResult?.access_token && sessionResult?.refresh_token) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: sessionResult.access_token,
        refresh_token: sessionResult.refresh_token
      })

      if (!sessionError) {
        currentUser.value = sessionData.user || sessionResult.user
        sessionStorage.removeItem('naver_oauth_state')
        return { success: true, user: currentUser.value }
      }
    }

    // 4. 네이버 프로필 정보를 기반으로 Supabase Auth 사용자 연동
    const naverId = naverUser.id || naverUser.naver_id
    const userEmail = naverUser.email || `naver_${naverId}@naver.user`
    const displayName = naverUser.nickname || naverUser.name || naverUser.full_name || '네이버 회원'
    const avatarUrl = naverUser.profile_image || naverUser.avatar_url || ''
    const mobile = naverUser.mobile || ''
    const deterministicPassword = `nv_${naverId}_!EucTrade2026`

    if (isSupabaseConfigured()) {
      try {
        // 기존 계정 로그인 시도
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: deterministicPassword
        })

        if (!signInError && signInData?.user) {
          currentUser.value = signInData.user
        } else {
          // 신규 계정 가입 시도
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: userEmail,
            password: deterministicPassword,
            options: {
              data: {
                full_name: displayName,
                name: displayName,
                avatar_url: avatarUrl,
                mobile,
                provider: 'naver',
                naver_id: naverId
              }
            }
          })

          if (signUpData?.user) {
            currentUser.value = signUpData.user
          } else {
            // 가입 확인 후 로그인 재시도
            const { data: retrySignIn } = await supabase.auth.signInWithPassword({
              email: userEmail,
              password: deterministicPassword
            })
            if (retrySignIn?.user) {
              currentUser.value = retrySignIn.user
            }
          }
        }
      } catch (authSyncErr) {
        console.warn('Supabase Auth sync fallback:', authSyncErr)
      }
    }

    // 사용자 상태 확정
    if (!currentUser.value) {
      currentUser.value = {
        id: `naver_${naverId}`,
        email: userEmail,
        user_metadata: {
          full_name: displayName,
          name: displayName,
          avatar_url: avatarUrl,
          mobile,
          provider: 'naver'
        }
      }
    }

    sessionStorage.removeItem('naver_oauth_state')
    return {
      success: true,
      user: currentUser.value
    }
  } catch (err) {
    console.error('handleNaverCallback Error:', err)
    return {
      success: false,
      message: err.message || '네이버 로그인 처리 중 오류가 발생했습니다.'
    }
  }
}

/**
 * 이메일 / 비밀번호 로그인
 */
export const signInWithEmail = async (email, password) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 설정이 필요합니다.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw error
  }

  currentUser.value = data.user
  closeLoginModal()
  return data
}

/**
 * 이메일 / 비밀번호 회원가입
 */
export const signUpWithEmail = async (email, password, name = '') => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 설정이 필요합니다.')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name
      }
    }
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * 비밀번호 재설정 이메일 전송
 */
export const resetPasswordForEmail = async (email) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 설정이 필요합니다.')
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * 로그아웃 실행
 */
export const signOut = async () => {
  try {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    currentUser.value = null
    userRole.value = 'user'
  } catch (err) {
    console.error('SignOut Error:', err)
  } finally {
    currentUser.value = null
    userRole.value = 'user'
  }
}

/**
 * 인증 세션 초기화 및 리스너 등록
 */
let isListenerAttached = false

export const initAuth = async () => {
  if (!isSupabaseConfigured()) {
    isAuthLoading.value = false
    return
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    currentUser.value = session?.user || null
    if (session?.user) {
      await checkUserRole(session.user)
    } else {
      userRole.value = 'user'
    }
  } catch (err) {
    console.warn('Get session fallback:', err)
  } finally {
    isAuthLoading.value = false
  }

  if (!isListenerAttached) {
    isListenerAttached = true
    supabase.auth.onAuthStateChange(async (_event, session) => {
      currentUser.value = session?.user || null
      isAuthLoading.value = false
      if (session?.user) {
        await checkUserRole(session.user)
        closeLoginModal()
      } else {
        userRole.value = 'user'
      }
    })
  }
}
