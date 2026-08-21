import { supabase, isSupabaseConfigured } from './supabase'
import { isAdminOrStaff } from './auth'

const STORAGE_LAST_VISIT_DATE = 'euchs_last_visit_date'
const STORAGE_LOCAL_VISIT_COUNTS = 'euchs_local_visit_history'

/**
 * 로컬 스토리지에 저장된 일별 방문자 카운트 조회
 */
export const getLocalVisitHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_VISIT_COUNTS)
    return raw ? JSON.parse(raw) : {}
  } catch (err) {
    return {}
  }
}

/**
 * 로컬 스토리지 방문자 카운트 1 증가
 */
export const incrementLocalVisitCount = (dateStr) => {
  try {
    const history = getLocalVisitHistory()
    history[dateStr] = (history[dateStr] || 0) + 1
    localStorage.setItem(STORAGE_LOCAL_VISIT_COUNTS, JSON.stringify(history))
  } catch (err) {
    console.warn('Local analytics storage error:', err)
  }
}

/**
 * 로컬 방문 통계 요약 (Fallback)
 */
export const getLocalVisitStats = () => {
  const history = getLocalVisitHistory()
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${date}`
  const currentYearMonth = `${year}-${month}`

  let todayCount = history[todayStr] || 0
  let thisMonthCount = 0
  let totalCount = 0

  for (const [dateKey, count] of Object.entries(history)) {
    const num = Number(count) || 0
    totalCount += num
    if (dateKey.startsWith(currentYearMonth)) {
      thisMonthCount += num
    }
  }

  return {
    today: todayCount,
    thisMonth: thisMonthCount,
    total: totalCount
  }
}

/**
 * 일반 사용자 방문 로그 기록 (하루 1회 집계, 관리자/스태프 제외)
 */
export const recordVisit = async (path = '/') => {
  try {
    // 1. 관리자 페이지 및 로그인 페이지 접속 제외
    if (!path || path.startsWith('/admin') || path === '/login') {
      return
    }

    // 2. 현재 세션이 관리자 또는 직원 권한인 경우 집계 제외
    if (isAdminOrStaff && isAdminOrStaff.value) {
      return
    }

    // 3. 오늘 날짜 (YYYY-MM-DD)
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const date = String(now.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${date}`

    // 4. 오늘 이미 방문 기록을 남겼는지 확인 (세션/로컬스토리지 기준 하루 1회)
    const lastVisit = localStorage.getItem(STORAGE_LAST_VISIT_DATE)
    if (lastVisit === todayStr) {
      return
    }

    // 오늘 방문 플래그 설정
    localStorage.setItem(STORAGE_LAST_VISIT_DATE, todayStr)
    localStorage.setItem('euchs_last_visit_time', now.toISOString())

    // 로컬 집계 카운트 증가
    incrementLocalVisitCount(todayStr)

    // 5. Supabase에 방문 로그 저장
    if (isSupabaseConfigured()) {
      await supabase.from('site_visits').insert([{
        visited_date: todayStr,
        page_path: path,
        referrer: typeof document !== 'undefined' ? (document.referrer || '') : '',
        user_agent: typeof navigator !== 'undefined' ? (navigator.userAgent || '').substring(0, 200) : '',
        created_at: now.toISOString()
      }])
    }
  } catch (err) {
    console.warn('Analytics recordVisit error:', err)
  }
}

/**
 * 관리자 대시보드용 방문자 통계 조회 (Today, This Month, Total)
 */
export const getVisitorStats = async () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${date}`
  const monthStartStr = `${year}-${month}-01T00:00:00.000Z`
  const todayStartStr = `${todayStr}T00:00:00.000Z`

  let today = 0
  let thisMonth = 0
  let total = 0
  let isDbSuccess = false

  if (isSupabaseConfigured()) {
    try {
      // 1. 오늘 방문자 수 (Today)
      const { count: todayCount, error: todayErr } = await supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStartStr)

      // 2. 이번 달 방문자 수 (This Month)
      const { count: monthCount, error: monthErr } = await supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStartStr)

      // 3. 전체 누적 방문자 수 (Total)
      const { count: totalCount, error: totalErr } = await supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true })

      if (!todayErr && typeof todayCount === 'number') {
        today = todayCount
        isDbSuccess = true
      }
      if (!monthErr && typeof monthCount === 'number') {
        thisMonth = monthCount
      }
      if (!totalErr && typeof totalCount === 'number') {
        total = totalCount
      }
    } catch (err) {
      console.warn('Supabase getVisitorStats error:', err)
    }
  }

  // 로컬 통계 데이터 보정 (DB 통계가 비어있거나 실패한 경우 로컬 fallback 반영)
  const localStats = getLocalVisitStats()
  if (!isDbSuccess || (today === 0 && localStats.today > 0)) {
    today = Math.max(today, localStats.today)
  }
  if (!isDbSuccess || (thisMonth === 0 && localStats.thisMonth > 0)) {
    thisMonth = Math.max(thisMonth, localStats.thisMonth)
  }
  if (!isDbSuccess || (total === 0 && localStats.total > 0)) {
    total = Math.max(total, localStats.total)
  }

  return {
    today,
    thisMonth,
    total
  }
}
