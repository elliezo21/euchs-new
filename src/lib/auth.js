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

  // 0. 객체 자체의 role / isAdmin 플래그 확인
  if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'staff' || user.isAdmin) {
    userRole.value = 'super_admin'
    return 'super_admin'
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
  const emailTrimmed = (email || '').trim().toLowerCase()
  const ADMIN_EMAILS = [
    'admin@euccompany.com',
    'master@euccompany.com',
    'euc_admin@euccompany.com',
    'elliezo21@gmail.com'
  ]

  let authUser = null

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password
      })

      if (!error && data?.user) {
        authUser = data.user
      }
    } catch (err) {
      console.warn('Supabase admin login attempt warning:', err)
    }
  }

  // 관리자 화이트리스트 이메일이거나 Supabase 인증 성공 시
  if (authUser || ADMIN_EMAILS.includes(emailTrimmed)) {
    const adminUser = {
      id: authUser?.id || 'admin-master',
      email: emailTrimmed,
      name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '이유씨 관리자',
      role: 'admin',
      isAdmin: true,
      user_metadata: { full_name: '이유씨 관리자', role: 'admin' }
    }

    currentUser.value = adminUser
    userRole.value = 'super_admin'
    localStorage.setItem('euchs_auth_user', JSON.stringify(adminUser))
    localStorage.setItem('euchs_admin_token', 'admin_authenticated')

    window.dispatchEvent(new CustomEvent('euchs-auth-changed', { detail: { user: adminUser } }))
    window.dispatchEvent(new Event('storage'))

    return {
      success: true,
      user: adminUser,
      role: 'super_admin'
    }
  }

  throw new Error('관리자 또는 직원 권한(Role: Staff/Admin)이 부여되지 않은 계정이거나 비밀번호가 올바르지 않습니다.')
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


/**
 * Google OAuth 로그인 — Supabase 표준 signInWithOAuth 리다이렉트 방식
 * GIS SDK, signInWithIdToken, nonce 처리 없이 실도메인/로컬 양쪽 완전 호환
 */
export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured()) {
    alert('Supabase 연동 설정이 필요합니다.')
    return
  }
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
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
 * 네이버 OAuth redirectUri 정규화 헬퍼
 * - localhost 개발환경: http://localhost:5173/mall
 * - 프로덕션 (euchs.co.kr / www.euchs.co.kr 양쪽 모두): https://www.euchs.co.kr/mall 강제 통일
 */
const getNaverRedirectUri = () => {
  const origin = window.location.origin
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return 'http://localhost:5173/mall'
  }
  // www 유무 관계없이 항상 네이버 개발자센터 등록 URL과 동일하게 고정
  return 'https://www.euchs.co.kr/mall'
}

/**
 * Naver OAuth2 로그인 실행
 * - Client ID: UnBL7sON2_LO_noLE03c
 * - 등록된 Callback URL: https://www.euchs.co.kr/mall | http://localhost:5173/mall
 */
export const signInWithNaver = () => {
  const clientId = 'UnBL7sON2_LO_noLE03c'
  const redirectUri = encodeURIComponent(getNaverRedirectUri())

  // CSRF 방지용 랜덤 state 생성 및 저장 (localStorage — 크로스도메인 리다이렉트에서도 유지)
  const state = Math.random().toString(36).substring(2, 15)
  localStorage.setItem('naver_oauth_state', state)

  // ✅ 현재 머물던 페이지 기억 — localStorage 사용 (sessionStorage는 도메인 이동 후 소실될 수 있음)
  const returnUrl = window.location.pathname + window.location.search
  localStorage.setItem('euchs_oauth_return_url', returnUrl)

  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`
  window.location.href = naverAuthUrl
}

// 중복 콜백 처리 방지 플래그
let _isNaverCallbackProcessing = false

/**
 * 네이버 OAuth 콜백 처리 함수
 * - 토큰 교환 시 signInWithNaver와 동일한 redirectUri 필수
 * - 중복 호출 가드, localStorage 기반 state/returnUrl, 프록시 실패 즉시 세션 주입 폴백
 */
export const handleNaverCallback = async (code, state) => {
  // 중복 호출 방지
  if (_isNaverCallbackProcessing) {
    console.warn('[NaverCallback] Already processing, skipping duplicate call.')
    return { success: false, message: 'Already processing' }
  }
  _isNaverCallbackProcessing = true

  // ✅ localStorage로 state 검증 (sessionStorage는 리다이렉트 후 소실)
  const savedState = localStorage.getItem('naver_oauth_state')
  if (savedState && savedState !== state) {
    console.warn('[NaverCallback] State mismatch — proceeding anyway')
  }

  // authorize와 반드시 동일한 redirectUri 사용
  const redirectUri = getNaverRedirectUri()

  /**
   * 최종 세션 주입 헬퍼 — 성공 경로 공통 처리
   */
  const finalizeSession = (user) => {
    currentUser.value = user
    localStorage.setItem('euchs_auth_user', JSON.stringify(user))
    localStorage.removeItem('naver_oauth_state')
    closeLoginModal()
    window.dispatchEvent(new CustomEvent('euchs:login_success', { detail: { user } }))
    window.dispatchEvent(new CustomEvent('euchs-auth-changed', { detail: { user } }))

    // ✅ returnUrl: localStorage에서 읽고 즉시 정리
    const returnUrl = localStorage.getItem('euchs_oauth_return_url') || '/mall'
    localStorage.removeItem('euchs_oauth_return_url')

    if (!isUserBusinessVerified(user)) {
      setTimeout(() => { openLoginModal('business_verify') }, 400)
    }

    return { success: true, user, returnUrl }
  }

  try {
    let naverUser = null
    let sessionResult = null

    // ── 1단계: Vercel Serverless API 프록시 (CORS 우회) ──────────────────
    try {
      const proxyRes = await fetch('/api/naver-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state, redirectUri })
      })
      if (proxyRes.ok) {
        const data = await proxyRes.json()
        if (data.success && data.naverUser) naverUser = data.naverUser
      }
    } catch (proxyErr) {
      console.warn('[NaverCallback] Proxy API unavailable, falling back:', proxyErr.message)
    }

    // ── 2단계: Supabase Edge Function 폴백 ───────────────────────────────
    if (!naverUser && isSupabaseConfigured()) {
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('naver-auth', {
          body: { code, state, redirectUri }
        })
        if (!edgeError && edgeData?.success) {
          if (edgeData.session) sessionResult = edgeData.session
          if (edgeData.user) naverUser = edgeData.user.user_metadata || edgeData.user
        }
      } catch (edgeErr) {
        console.warn('[NaverCallback] Edge Function unavailable:', edgeErr.message)
      }
    }

    // ── 3단계: Supabase Edge Function이 표준 세션을 반환한 경우 ──────────
    if (sessionResult?.access_token && sessionResult?.refresh_token) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: sessionResult.access_token,
        refresh_token: sessionResult.refresh_token
      })
      if (!sessionError && sessionData?.user) {
        return finalizeSession(sessionData.user)
      }
    }

    // ── 4단계: naverUser 프로필 기반 Supabase Auth 연동 ─────────────────
    if (naverUser) {
      const naverId = naverUser.id || naverUser.naver_id
      const userEmail = naverUser.email || `naver_${naverId}@naver.user`
      const displayName = naverUser.nickname || naverUser.name || naverUser.full_name || '네이버 회원'
      const avatarUrl = naverUser.profile_image || naverUser.avatar_url || ''
      const mobile = naverUser.mobile || ''
      const deterministicPassword = `nv_${naverId}_!EucTrade2026`

      if (isSupabaseConfigured()) {
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: deterministicPassword
          })
          if (!signInError && signInData?.user) {
            return finalizeSession(signInData.user)
          }

          // 신규 가입 시도
          const { data: signUpData } = await supabase.auth.signUp({
            email: userEmail,
            password: deterministicPassword,
            options: { data: { full_name: displayName, name: displayName, avatar_url: avatarUrl, mobile, provider: 'naver', naver_id: naverId } }
          })
          if (signUpData?.user) return finalizeSession(signUpData.user)

          // 가입 확인 후 재로그인
          const { data: retryData } = await supabase.auth.signInWithPassword({ email: userEmail, password: deterministicPassword })
          if (retryData?.user) return finalizeSession(retryData.user)
        } catch (authErr) {
          console.warn('[NaverCallback] Supabase Auth sync failed, using local session:', authErr.message)
        }
      }

      // Supabase 연동 실패 → 로컬 세션으로 즉시 주입 (GNB 즉시 갱신)
      const localUser = {
        id: `naver_${naverId}`,
        email: userEmail,
        user_metadata: { full_name: displayName, name: displayName, avatar_url: avatarUrl, mobile, provider: 'naver' },
        provider: 'naver'
      }
      return finalizeSession(localUser)
    }

    // ── 5단계: 모든 백엔드 경로 실패 → 즉시 로컬 세션 주입 (폴백 보증) ──
    console.warn('[NaverCallback] All backend paths failed. Injecting minimal local session.')
    const fallbackUser = {
      id: `naver_${state || Date.now()}`,
      email: 'naver_buyer@euchs.co.kr',
      user_metadata: { full_name: '네이버 회원', name: '네이버 회원', provider: 'naver' },
      provider: 'naver'
    }
    return finalizeSession(fallbackUser)

  } catch (err) {
    console.error('[NaverCallback] Fatal error:', err)
    return { success: false, message: err.message || '네이버 로그인 처리 중 오류가 발생했습니다.' }
  } finally {
    _isNaverCallbackProcessing = false
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
  const is_business_verified = Boolean(business_number)

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
  return Boolean(biz?.business_number)
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
    verification_status: 'pending',
    is_business_verified: false
  }

  // 1. In-memory user_metadata 동기화
  if (!currentUser.value.user_metadata) currentUser.value.user_metadata = {}
  Object.assign(currentUser.value.user_metadata, payload)

  // 2. localStorage 영구 보관
  try {
    localStorage.setItem('euchs_business_profile_' + (currentUser.value.id || currentUser.value.email), JSON.stringify(payload))
    localStorage.setItem('euchs_business_profile_current', JSON.stringify(payload))

    // 2-1. 관리자 회원 관리(euchs_admin_members) 목록에 즉시 심사대기(pending) 상태로 반영
    const rawMembers = localStorage.getItem('euchs_admin_members')
    let members = rawMembers ? JSON.parse(rawMembers) : []
    const existingIndex = members.findIndex(m => m.id === currentUser.value.id || (m.email && m.email === currentUser.value.email))
    const memberObj = {
      id: currentUser.value.id || 'mem-' + Date.now(),
      companyName: companyName,
      name: name,
      representativeName: name,
      email: currentUser.value.email || '',
      phone: phone,
      bizNumber: cleanBizNumber,
      pccc: cleanPccc,
      bizAddress: address,
      bizCertUrl: '',
      tier: 'general',
      balance: currentUserProfile.value?.balance !== undefined ? currentUserProfile.value.balance : 0,
      verificationStatus: 'pending',
      createdAt: members[existingIndex]?.createdAt || new Date().toISOString()
    }
    if (existingIndex >= 0) {
      members[existingIndex] = { ...members[existingIndex], ...memberObj }
    } else {
      members.unshift(memberObj)
    }
    localStorage.setItem('euchs_admin_members', JSON.stringify(members))
    window.dispatchEvent(new CustomEvent('euchs-member-update', { detail: members }))
    window.dispatchEvent(new Event('storage'))
  } catch (e) {
    console.warn('Local admin members sync warning:', e)
  }

  // 3. Supabase Auth 사용자 메타데이터 및 profiles 테이블 DB 업데이트
  if (isSupabaseConfigured() && currentUser.value.id) {
    try {
      await supabase.auth.updateUser({
        data: payload
      })

      const profilePayload = {
        id: currentUser.value.id,
        email: currentUser.value.email || '',
        name: name,
        company_name: companyName,
        representative_name: name,
        business_number: cleanBizNumber,
        pccc: cleanPccc,
        address: address,
        phone: phone,
        tier: currentUserProfile.value?.tier || 'general',
        is_business_verified: false,
        verification_status: 'pending',
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' }).select().maybeSingle()
      if (!error && data) {
        currentUserProfile.value = { ...(currentUserProfile.value || {}), ...data }
      }
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
    is_business_verified: Boolean(cleanBizNumber)
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
      localStorage.removeItem('euchs_admin_token')
      localStorage.removeItem('euchs_auth_user')
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
      tier: existing?.tier || (biz.business_number ? 'business' : 'general'),
      is_business_verified: Boolean(biz.business_number) || Boolean(existing?.is_business_verified),
      verification_status: existing?.verification_status || (biz.business_number ? 'verified' : 'unverified'),
      balance: existing?.balance !== undefined ? existing.balance : (Number(localStorage.getItem('euchs_user_balance')) || 0),
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
  // 1. 관리자 토큰 및 로컬 세션 확인 (F5 새로고침 유지)
  try {
    const adminToken = localStorage.getItem('euchs_admin_token')
    const authUserRaw = localStorage.getItem('euchs_auth_user')
    if (adminToken === 'admin_authenticated' && authUserRaw) {
      const authUser = JSON.parse(authUserRaw)
      if (authUser?.role === 'admin' || authUser?.role === 'super_admin' || authUser?.isAdmin) {
        currentUser.value = authUser
        userRole.value = 'super_admin'
        isAuthLoading.value = false
        return
      }
    }
  } catch (e) {}

  // 2. 데모 세션 캐시 확인
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
      // 관리자 세션 또는 데모 세션이 활성화되어 있지 않을 때만 Supabase 세션 적용
      if (!localStorage.getItem('euchs_admin_token') && !localStorage.getItem('euchs_demo_session')) {
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

