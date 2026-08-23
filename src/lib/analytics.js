import { supabase, isSupabaseConfigured } from './supabase'

/**
 * 일반 사용자 방문 로그 기록 (Tracking)
 * - /admin 등 관리자 경로는 즉시 제외
 * - localStorage를 활용해 동일 브라우저 당일 1회만 집계
 * - Supabase visitor_logs 테이블에 1줄 INSERT
 */
export const trackVisitor = async (path = '') => {
  if (typeof window === 'undefined') return

  const targetPath = (path || window.location.pathname || '/').trim()

  // 1. 관리자 페이지 및 로그인 페이지 접속 제외
  if (
    targetPath.startsWith('/admin') ||
    targetPath === '/login' ||
    targetPath.startsWith('/login')
  ) {
    return
  }

  // 2. 당일(로컬 기준) 1회만 중복 방지 집계
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (localStorage.getItem('euchs_visited_date') === todayStr) {
    return
  }
  localStorage.setItem('euchs_visited_date', todayStr)

  // 3. Supabase visitor_logs 테이블에 INSERT
  if (isSupabaseConfigured()) {
    try {
      const deviceType = /Mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      await supabase.from('visitor_logs').insert([{
        page_path: targetPath,
        device_type: deviceType,
        user_agent: typeof navigator !== 'undefined' ? (navigator.userAgent || '').substring(0, 255) : ''
      }])
    } catch (err) {
      console.warn('visitor_logs trackVisitor error:', err)
    }
  }
}

// 하위 호환 alias
export const recordVisit = trackVisitor

/**
 * 관리자 대시보드 방문자 통계 조회 (Dashboard)
 * - Supabase visitor_logs 내장 count 기능을 통해 실제 DB 행 수를 직접 실시간 조회
 */
export const getVisitorStats = async () => {
  if (!isSupabaseConfigured()) {
    return { today: 0, thisMonth: 0, total: 0 }
  }

  try {
    // 1. 전체 누적 방문자 수 (Total)
    const { count: totalVisitors, error: totalErr } = await supabase
      .from('visitor_logs')
      .select('*', { count: 'exact', head: true })

    if (totalErr) throw totalErr

    // 2. 오늘 방문자 수 (KST/로컬 오늘 00시 이후)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayVisitors, error: todayErr } = await supabase
      .from('visitor_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    if (todayErr) throw todayErr

    // 3. 이번 달 방문자 수 (당월 1일 00시 이후)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0)
    const { count: monthVisitors, error: monthErr } = await supabase
      .from('visitor_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    if (monthErr) throw monthErr

    return {
      today: typeof todayVisitors === 'number' ? todayVisitors : 0,
      thisMonth: typeof monthVisitors === 'number' ? monthVisitors : 0,
      total: typeof totalVisitors === 'number' ? totalVisitors : 0
    }
  } catch (err) {
    console.warn('getVisitorStats error:', err)
    return { today: 0, thisMonth: 0, total: 0 }
  }
}

