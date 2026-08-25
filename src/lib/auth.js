import { ref, computed } from 'vue'
import { supabase, isSupabaseConfigured } from './supabase'

export const currentUser = ref(null)
export const currentUserProfile = ref(null) // Supabase profiles 테이블 데이터 (balance, company_name, pccc 등)
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
  let normalized = mode || 'login'
  if (normalized === 'register') normalized = 'signup'
  if (normalized === 'business' || normalized === 'verify') normalized = 'business_verify'
  loginModalMode.value = normalized
  isLoginModalOpen.value = true
}

export const openAuthModal = openLoginModal

export const closeLoginModal = () => {
  isLoginModalOpen.value = false
}

export const closeAuthModal = closeLoginModal

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '637980227155-clcfso2b4jl9lmp3rp907d59uttavjp6.apps.googleusercontent.com'

/**
 * Google OAuth 로그인 — Supabase 표준 signInWithOAuth 리다이렉트 방식 (nonce 이슈 원천 해결)
 * GIS One-Tap / signInWithIdToken 방식은 Supabase nonce 검증 오류를 유발하므로
 * 실도메인(euchs.co.kr)과 localhost 모두에서 안전한 표준 OAuth 리다이렉트로 단일화합니다.
 */
export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured()) {
    alert('Supabase 연동 설정이 필요합니다.')
    return
  }
  try {
    const redirectTo = `${window.location.origin}/`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    })
    if (error) {
      console.error('Google OAuth error:', error)
      alert(`구글 로그인 중 오류가 발생했습니다: ${error.message}`)
    }
  } catch (err) {
    console.error('Google OAuth exception:', err)
    alert('구글 로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.')
  }
}

/**
 * Google GIS 버튼 렌더링 함수 (deprecated: signInWithOAuth 방식으로 전환됨)
 * 하위 호환성을 위해 no-op으로 유지합니다.
 */
export const renderGoogleButton = async (_containerEl, _options = {}) => {
  // GIS SDK 렌더링 방식은 signInWithOAuth로 대체되었습니다.
  return false
}

/**
 * @deprecated signInWithGoogle을 사용하세요.
 * Google ID Token 처리 함수 — signInWithOAuth 전환 후 미사용
 */
export const handleGoogleCredentialResponse = async (response) => {
  if (!response?.credential) return { success: false }
  console.warn('handleGoogleCredentialResponse is deprecated. Use signInWithGoogle (signInWithOAuth) instead.')
  return { success: false, message: 'signInWithOAuth 방식을 사용하세요.' }
}

/**
 * @deprecated loadGsiScript는 signInWithOAuth 전환 후 미사용
 */
export const loadGsiScript = () => Promise.resolve(null)

/**
 * Kakao OAuth 로그인 실행
 */
export const signInWithKakao = async () => {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase 연동 설정이 필요합니다.')
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) {
      console.warn('Kakao OAuth error:', error)
      throw error
    }
    return data
  } catch (err) {
    console.error('Kakao Login Exception:', err)
    alert(`카카오 로그인 처리 중 문제가 발생했습니다: ${err.message || err}`)
  }
}

/**
 * Naver OAuth2 로그인 실행
 */
export const signInWithNaver = () => {
  try {
    const clientId = import.meta.env.VITE_NAVER_CLIENT_ID || 'UnBL7sON2_LO_noLE03c'
    const redirectUri = import.meta.env.VITE_NAVER_REDIRECT_URI || `${window.location.origin}/auth/callback/naver`

    if (!clientId || clientId === '여기에_네이버_CLIENT_ID') {
      alert('현재 네이버 간편 로그인은 연동 준비 중입니다. 이메일 간편 로그인을 이용해 주세요.')
      return
    }

    // CSRF 방지용 랜덤 state 생성 및 저장
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    sessionStorage.setItem('naver_oauth_state', state)

    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`

    window.location.href = naverAuthUrl
  } catch (err) {
    console.warn('Naver Login Exception:', err)
    alert('현재 네이버 간편 로그인은 연동 준비 중입니다. 이메일 간편 로그인을 이용해 주세요.')
  }
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
    
    // SNS 간편가입/로그인 후 사업자 정보 미등록 시 즉시 입력 유도
    if (!isUserBusinessVerified(currentUser.value)) {
      setTimeout(() => {
        openLoginModal('business_verify')
      }, 350)
    }

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
    email: (email || '').trim(),
    password
  })

  if (error) {
    if (error.message?.includes('Invalid login credentials')) {
      throw new Error('아이디(이메일) 또는 비밀번호가 일치하지 않습니다.')
    }
    if (error.message?.includes('Email not confirmed')) {
      throw new Error('이메일 인증이 완료되지 않은 계정입니다. 이메일을 확인해 주세요.')
    }
    throw error
  }

  currentUser.value = data.user
  closeLoginModal()
  return data
}

/**
 * 사용자 B2B 사업자 정보 조회 헬퍼
 */
export const getUserBusinessInfo = (user = currentUser.value) => {
  if (!user) return null
  const meta = user.user_metadata || {}
  let stored = {}
  try {
    const raw = localStorage.getItem('euchs_business_profile_' + (user.id || user.email)) || localStorage.getItem('euchs_business_profile_current')
    if (raw) stored = JSON.parse(raw)
  } catch (e) {}

  const company_name = meta.company_name || stored.company_name || ''
  const business_number = meta.business_number || stored.business_number || ''
  const pccc = meta.pccc || stored.pccc || ''
  const address = meta.address || stored.address || ''
  const phone = meta.phone || stored.phone || user.phone || ''
  const name = meta.full_name || meta.name || stored.name || ''
  const is_business_verified = Boolean(business_number && pccc)

  return {
    company_name,
    business_number,
    pccc,
    address,
    phone,
    name,
    is_business_verified
  }
}

/**
 * 사업자 인증 여부 검증 함수
 */
export const isUserBusinessVerified = (user = currentUser.value) => {
  if (!user) return false
  const biz = getUserBusinessInfo(user)
  return Boolean(biz?.business_number && biz?.pccc)
}

export const isBusinessVerified = computed(() => {
  return isUserBusinessVerified(currentUser.value)
})

/**
 * B2B 사업자 프로필 업데이트 함수
 */
export const updateBusinessProfile = async (businessData) => {
  if (!currentUser.value) {
    throw new Error('로그인이 필요합니다.')
  }

  const cleanBizNumber = (businessData.business_number || '').replace(/[^0-9]/g, '')
  const cleanPccc = (businessData.pccc || '').trim().toUpperCase()
  const companyName = (businessData.company_name || '').trim()
  const address = (businessData.address || '').trim()
  const phone = (businessData.phone || '').trim()
  const name = (businessData.name || currentUser.value.user_metadata?.full_name || '').trim()

  const payload = {
    company_name: companyName,
    business_number: cleanBizNumber,
    pccc: cleanPccc,
    address: address,
    phone: phone,
    name: name,
    is_business_verified: true
  }

  // 1. In-memory user_metadata 동기화
  if (!currentUser.value.user_metadata) currentUser.value.user_metadata = {}
  Object.assign(currentUser.value.user_metadata, payload)

  // 2. localStorage 영구 보관
  try {
    localStorage.setItem('euchs_business_profile_' + (currentUser.value.id || currentUser.value.email), JSON.stringify(payload))
    localStorage.setItem('euchs_business_profile_current', JSON.stringify(payload))
  } catch (e) {}

  // 3. Supabase Auth 사용자 메타데이터 업데이트
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.updateUser({
        data: payload
      })
      await syncUserProfile(currentUser.value)
    } catch (err) {
      console.warn('Supabase updateUser business metadata notice:', err)
    }
  }

  return payload
}

/**
 * 이메일 / 비밀번호 B2B 사업자 회원가입
 */
export const signUpWithEmail = async (email, password, businessData = {}) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 설정이 필요합니다.')
  }

  const name = (businessData.name || '').trim()
  const phone = (businessData.phone || '').trim()
  const companyName = (businessData.company_name || '').trim()
  const cleanBizNumber = (businessData.business_number || '').replace(/[^0-9]/g, '')
  const cleanPccc = (businessData.pccc || '').trim().toUpperCase()
  const address = (businessData.address || '').trim()

  const metaData = {
    full_name: name,
    name: name,
    phone: phone,
    company_name: companyName,
    business_number: cleanBizNumber,
    pccc: cleanPccc,
    address: address,
    is_business_verified: Boolean(cleanBizNumber && cleanPccc)
  }

  const { data, error } = await supabase.auth.signUp({
    email: (email || '').trim(),
    password,
    options: {
      data: metaData
    }
  })

  if (error) {
    if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
      throw new Error('이미 등록된 이메일 계정입니다. 로그인을 진행해 주세요.')
    }
    if (error.message?.includes('Password should be at least')) {
      throw new Error('비밀번호는 최소 6자 이상이어야 합니다.')
    }
    throw error
  }

  if (data?.user) {
    try {
      localStorage.setItem('euchs_business_profile_' + (data.user.id || data.user.email), JSON.stringify(metaData))
      localStorage.setItem('euchs_business_profile_current', JSON.stringify(metaData))
    } catch (e) {}
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

  const { data, error } = await supabase.auth.resetPasswordForEmail((email || '').trim(), {
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
  } catch (err) {
    console.error('SignOut Error:', err)
  } finally {
    currentUser.value = null
    userRole.value = 'user'
    try {
      localStorage.removeItem('euchs_demo_session')
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('euchs-auth-changed', { detail: { user: null } }))
    window.dispatchEvent(new Event('storage'))
  }
}

/**
 * 사용자 프로필 DB (public.profiles) 실시간 조회
 */
export const fetchUserProfile = async (userId) => {
  if (!userId || !isSupabaseConfigured() || userId === 'demo-buyer-01') return null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!error && data) {
      currentUserProfile.value = data
      try {
        localStorage.setItem(`euchs_profile_${userId}`, JSON.stringify(data))
      } catch (e) {}
      return data
    }
  } catch (err) {
    console.warn('fetchUserProfile error:', err)
  }
  return null
}

/**
 * 사용자 프로필 DB (public.profiles) 자동 생성 및 동기화
 */
export const syncUserProfile = async (user) => {
  if (!user || !isSupabaseConfigured() || user.id === 'demo-buyer-01') return
  try {
    const meta = user.user_metadata || {}
    const biz = getUserBusinessInfo(user) || {}
    
    // 1. 기존 DB 프로필 조회하여 기존 balance 및 설정값 보존
    const existing = await fetchUserProfile(user.id)

    const profilePayload = {
      id: user.id,
      email: user.email || '',
      name: meta.full_name || meta.name || biz.name || user.email?.split('@')[0] || '회원',
      avatar_url: meta.avatar_url || meta.picture || '',
      phone: meta.phone || meta.mobile || biz.phone || '',
      company_name: biz.company_name || existing?.company_name || '',
      representative_name: biz.name || existing?.representative_name || '',
      business_number: biz.business_number || existing?.business_number || '',
      pccc: biz.pccc || existing?.pccc || '',
      address: biz.address || existing?.address || '',
      tier: existing?.tier || (biz.business_number && biz.pccc ? 'business' : 'general'),
      is_business_verified: Boolean(biz.business_number && biz.pccc) || Boolean(existing?.is_business_verified),
      verification_status: existing?.verification_status || (biz.business_number && biz.pccc ? 'verified' : 'unverified'),
      balance: existing?.balance !== undefined ? existing.balance : (Number(localStorage.getItem('euchs_user_balance')) || 15420000),
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' }).select().maybeSingle()
    if (!error && data) {
      currentUserProfile.value = data
    }
  } catch (err) {
    console.warn('Profile sync notice:', err)
  }
}

/**
 * 인증 세션 초기화 및 리스너 등록
 */
let isListenerAttached = false

export const initAuth = async () => {
  // 1. 데모 세션 캐시 확인
  try {
    const demoRaw = localStorage.getItem('euchs_demo_session')
    if (demoRaw) {
      const demoUser = JSON.parse(demoRaw)
      if (demoUser?.email) {
        currentUser.value = demoUser
        userRole.value = demoUser.role || 'buyer'
        isAuthLoading.value = false
        return
      }
    }
  } catch (e) {}

  if (!isSupabaseConfigured()) {
    isAuthLoading.value = false
    return
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    currentUser.value = session?.user || null
    if (session?.user) {
      await checkUserRole(session.user)
      await syncUserProfile(session.user)
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
      // 데모 세션이 활성화되어 있지 않을 때만 Supabase 세션 적용
      if (!localStorage.getItem('euchs_demo_session')) {
        currentUser.value = session?.user || null
        isAuthLoading.value = false
        if (session?.user) {
          await checkUserRole(session.user)
          await syncUserProfile(session.user)
          closeLoginModal()
        } else {
          userRole.value = 'user'
        }
      }
    })
  }
}
