/**
 * EUCHS 환율 공용 유틸
 *
 * 사용처:
 *  - Header.vue  : 배너 표시용
 *  - AdminSettingsView.vue : "갱신" 버튼 — 실제 시장환율 조회
 *  - getOrderCostSummary (OrderManageView, AdminOrderManageView) : 계산 기준
 */
import { fetchSiteSettings } from '@/lib/settings';

const ER_API_URL = 'https://open.er-api.com/v6/latest/CNY';

/**
 * open.er-api.com 에서 CNY→KRW 시장환율을 가져온다.
 * 실패 시 null 반환 (호출부에서 fallback 처리).
 * @returns {Promise<number|null>}
 */
export async function fetchLiveMarketRate() {
  try {
    const res = await fetch(ER_API_URL);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.rates?.KRW) {
      return Number(data.rates.KRW.toFixed(2));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * site_settings 의 모드(manual / auto_margin)에 따라
 * 실제 적용 환율을 반환한다.
 *
 * - manual  : settings.exchange_rate (관리자가 직접 입력한 고정값)
 * - auto_margin : 시장환율(open.er-api.com) + settings.rate_margin
 *
 * @param {Object} [settingsOverride] - 이미 fetch 된 settings 객체를 전달하면 재호출 생략
 * @returns {Promise<{ effectiveRate: number, liveMarketRate: number|null }>}
 */
export async function getEffectiveExchangeRate(settingsOverride = null) {
  const settings = settingsOverride || await fetchSiteSettings();
  const mode = settings?.exchange_rate_mode || 'manual';

  if (mode === 'auto_margin') {
    const marketRate = await fetchLiveMarketRate();
    if (marketRate !== null) {
      const margin = Number(settings?.rate_margin) || 1.5;
      const effectiveRate = Number((marketRate + margin).toFixed(2));
      return { effectiveRate, liveMarketRate: marketRate };
    }
    // API 실패 시 저장된 exchange_rate로 fallback
    const effectiveRate = Number(settings?.exchange_rate) || 226.19;
    return { effectiveRate, liveMarketRate: null };
  }

  // manual 모드
  const effectiveRate = Number(settings?.exchange_rate) || 226.19;
  return { effectiveRate, liveMarketRate: effectiveRate };
}
