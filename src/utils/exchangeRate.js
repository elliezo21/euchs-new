/**
 * EUCHS 환율 공용 유틸
 *
 * 사용처:
 *  - Header.vue  : 배너 표시용
 *  - AdminSettingsView.vue : "갱신" 버튼 — 실제 시장환율 조회
 *  - getOrderCostSummary (OrderManageView, AdminOrderManageView) : 계산 기준
 *
 * 갱신 정책:
 *   - 'daily'  : KST 자정(00:00) 기준 하루 1회 갱신 (기본값)
 *   - 'weekly' : KST 기준 해당 주 월요일 기준으로 주 1회 갱신
 *   "갱신" 버튼(forceRefresh=true) 클릭 시엔 캐시 무시하고 즉시 호출.
 */
import { fetchSiteSettings } from '@/lib/settings';

const ER_API_URL = 'https://open.er-api.com/v6/latest/CNY';
const CACHE_PREFIX = 'euchs_live_rate_'; // + 날짜키(YYYYMMDD)
const INTERVAL_KEY  = 'euchs_rate_refresh_interval'; // 'daily' | 'weekly'

// ── KST 날짜 헬퍼 ────────────────────────────────────────────

/** KST Date 객체 반환 (UTC+9 보정) */
function kstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

/** KST 날짜를 YYYYMMDD 문자열로 */
function dateToKey(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
}

/** KST 기준 오늘 날짜 키(YYYYMMDD) */
function getTodayKey() {
  return dateToKey(kstNow());
}

/** KST 기준 이번 주 월요일 날짜 키(YYYYMMDD) */
function getWeekStartKey() {
  const now = kstNow();
  const day = now.getUTCDay(); // 0=일 1=월 … 6=토
  const diff = (day === 0 ? -6 : 1 - day); // 월요일까지 delta
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return dateToKey(monday);
}

/**
 * site_settings.exchange_rate_refresh_interval 읽기.
 * localStorage 캐시를 먼저 확인해 불필요한 await 없이 동기적으로 반환.
 * @returns {'daily'|'weekly'}
 */
function getRefreshInterval() {
  try {
    const v = localStorage.getItem(INTERVAL_KEY);
    if (v === 'weekly') return 'weekly';
  } catch {}
  return 'daily'; // 기본값
}

/**
 * 현재 갱신 주기에 맞는 캐시 날짜키 반환.
 * - daily  → YYYYMMDD (오늘)
 * - weekly → YYYYMMDD (이번 주 월요일)
 */
function getCacheKey() {
  const interval = getRefreshInterval();
  const dateKey = interval === 'weekly' ? getWeekStartKey() : getTodayKey();
  return CACHE_PREFIX + dateKey;
}

/**
 * open.er-api.com 에서 CNY→KRW 시장환율을 가져온다.
 * 갱신 주기 설정(daily/weekly)에 따른 localStorage 캐시를 사용.
 * @param {boolean} [forceRefresh=false] - true면 캐시 무시하고 즉시 API 호출 (수동 "갱신" 버튼용)
 * @returns {Promise<{ rate: number|null, fromCache: boolean }>}
 *   rate: 환율값 (null이면 조회 실패)
 *   fromCache: true = 캐시 히트 (오늘 이미 조회된 값), false = API 신규 호출
 */
export async function fetchLiveMarketRate(forceRefresh = false) {
  const cacheKey = getCacheKey();

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached !== null) {
        const parsed = Number(cached);
        if (!isNaN(parsed) && parsed > 0) return { rate: parsed, fromCache: true };
      }
    } catch {}
  }

  try {
    const res = await fetch(ER_API_URL);
    if (!res.ok) return { rate: null, fromCache: false };
    const data = await res.json();
    if (data?.rates?.KRW) {
      const rate = Number(data.rates.KRW.toFixed(2));
      try {
        // 현재 주기 외 오래된 캐시 제거
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith(CACHE_PREFIX) && key !== cacheKey) {
            localStorage.removeItem(key);
          }
        }
        localStorage.setItem(cacheKey, String(rate));
      } catch {}
      return { rate, fromCache: false };
    }
    return { rate: null, fromCache: false };
  } catch {
    return { rate: null, fromCache: false };
  }
}

/**
 * 갱신 주기 설정값을 localStorage에 동기적으로 반영.
 * AdminSettingsView의 saveRateSettings에서 호출.
 * @param {'daily'|'weekly'} interval
 */
export function setRefreshInterval(interval) {
  try {
    localStorage.setItem(INTERVAL_KEY, interval === 'weekly' ? 'weekly' : 'daily');
  } catch {}
}


/**
 * 단 하나의 진실 소스(SSOT):
 * site_settings.exchange_rate (관리자가 최종 설정·저장한 공식 결제 환율)을 반환한다.
 * liveMarketRate는 국제 고시환율 참고치로만 제공.
 *
 * @param {Object} [settingsOverride] - 이미 fetch 된 settings 객체를 전달하면 재호출 생략
 * @returns {Promise<{ effectiveRate: number, liveMarketRate: number|null }>}
 */
export async function getEffectiveExchangeRate(settingsOverride = null) {
  const settings = settingsOverride || await fetchSiteSettings();
  const effectiveRate = Number(settings?.exchange_rate) || 226.19;
  const { rate: marketRate } = await fetchLiveMarketRate(false);

  return { effectiveRate, liveMarketRate: marketRate };
}
