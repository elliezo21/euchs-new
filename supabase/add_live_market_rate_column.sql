-- euchs: site_settings에 서버사이드 환율 자동 갱신용 컬럼 추가
-- Supabase Dashboard -> SQL Editor에서 실행

-- 국제 고시환율 원본 (open.er-api.com 응답값, Edge Function이 기록)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS live_market_rate NUMERIC DEFAULT NULL;

-- 마지막 자동 갱신 시각 (UTC 기준, 화면 표시용)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS rate_last_updated_at TIMESTAMPTZ DEFAULT NULL;
