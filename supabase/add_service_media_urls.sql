-- ==============================================================================
-- 4대 핵심 서비스 카드 미디어 URL 컬럼 및 JSONB 스키마 추가 마이그레이션
-- ==============================================================================

-- 1. site_settings 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  exchange_rate_mode TEXT DEFAULT 'manual',
  exchange_rate NUMERIC DEFAULT 230.0,
  rate_margin NUMERIC DEFAULT 1.5,
  agency_fee_rate NUMERIC DEFAULT 8.0,
  sea_cbm_rate NUMERIC DEFAULT 98000,
  customs_clearance_fee NUMERIC DEFAULT 33000,
  fta_co_fee NUMERIC DEFAULT 33000,
  hero_media_type TEXT DEFAULT 'video_mp4',
  hero_media_url TEXT DEFAULT '',
  hero_overlay_opacity NUMERIC DEFAULT 60
);

-- 2. JSONB 컬럼 및 텍스트 컬럼 안전하게 추가
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS service_media_urls JSONB DEFAULT '{"1":"","2":"","3":"","4":""}'::jsonb;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS service_card_media_rocket TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS service_card_media_purchasing TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS service_card_media_trade TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS service_card_media_tour TEXT DEFAULT '';

-- 3. 기본 row 보장 (id = 'default')
INSERT INTO public.site_settings (id, updated_at, service_media_urls)
VALUES ('default', NOW(), '{"1":"","2":"","3":"","4":""}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. 퍼블릭 RLS 권한 허용 (익명 및 관리자 모두 조회 및 갱신 가능)
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.site_settings;
DROP POLICY IF EXISTS "Allow public all access" ON public.site_settings;
DROP POLICY IF EXISTS "Public all site_settings" ON public.site_settings;

CREATE POLICY "Allow public read access" ON public.site_settings FOR SELECT TO public USING (true);
CREATE POLICY "Allow public all access" ON public.site_settings FOR ALL TO public USING (true) WITH CHECK (true);
