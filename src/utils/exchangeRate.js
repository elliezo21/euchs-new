/**
 * EUCHS 환율 공용 유틸 (v2 - 서버사이드 자동갱신 전환 후)
 *
 * 환율 갱신 구조:
 *   - Supabase Edge Function(fetch-live-rate)이 매일 00:00 KST에 자동 실행
 *   - open.er-api.com 호출 -> site_settings.live_market_rate 저장
 *   - auto_margin 모드면 exchange_rate = live_market_rate + rate_margin 도 자동 계산
 *   - 프론트는 fetchSiteSettings()로 DB 값만 읽음 (외부 API 직접 호출 없음)
 *
 * 사용처:
 *   - Header.vue: getEffectiveExchangeRate() -> effectiveRate, liveMarketRate 표시
 *   - AdminSettingsView.vue: 즉시갱신 버튼 -> invokeRateFetch() 로 Edge Function 트리거
 */
import { fetchSiteSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';

/**
 * 공식 결제 환율(effectiveRate)과 국제 고시환율(liveMarketRate)을 반환한다.
 * 두 값 모두 DB(site_settings)에서 읽어옴 — 외부 API 직접 호출 없음.
 *
 * @param {Object} [settingsOverride] - 이미 fetch된 settings 객체를 전달하면 재호출 생략
 * @returns {Promise<{ effectiveRate: number, liveMarketRate: number|null }>}
 */
export async function getEffectiveExchangeRate(settingsOverride = null) {
  const settings = settingsOverride || await fetchSiteSettings();
  const effectiveRate = settings?.exchange_rate != null ? Number(settings.exchange_rate) : null;
  const liveMarketRate = settings?.live_market_rate != null ? Number(settings.live_market_rate) : null;
  return { effectiveRate, liveMarketRate };
}

/**
 * 관리자 "즉시 갱신↻" 버튼 전용:
 * Edge Function(fetch-live-rate)을 즉시 1회 강제 호출한다.
 * 완료 후 최신 site_settings를 다시 읽어서 반환.
 *
 * @returns {Promise<{ success: boolean, live_market_rate: number|null, exchange_rate: number|null, error?: string }>}
 */
export async function invokeRateFetch() {
  try {
    // supabase.functions.invoke() 대신 fetch() 직접 호출
    // — supabase 클라이언트의 global Cache-Control 헤더가 Edge Function CORS preflight를 막는 문제 우회
    const { supabaseUrl, supabaseAnonKey } = await import('@/lib/supabase')
    const res = await fetch(`${supabaseUrl}/functions/v1/fetch-live-rate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    const data = await res.json()
    if (!res.ok || !data?.success) {
      console.error('[invokeRateFetch] Edge Function returned error:', data)
      return { success: false, live_market_rate: null, exchange_rate: null, error: data?.message || `HTTP ${res.status}` }
    }
    return {
      success: true,
      live_market_rate: data.live_market_rate ?? null,
      exchange_rate: data.exchange_rate ?? null,
    }
  } catch (err) {
    console.error('[invokeRateFetch] Unexpected error:', err)
    return { success: false, live_market_rate: null, exchange_rate: null, error: err.message }
  }
}
