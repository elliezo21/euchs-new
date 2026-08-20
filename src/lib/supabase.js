import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kkqxdvytjcwqiditkqay.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Key 유효성 확인
export const isSupabaseConfigured = () => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 10 &&
    !supabaseAnonKey.includes('여기에_방금') &&
    !supabaseAnonKey.includes('sb_publishable_키값')
  )
}

// Supabase Client Export
export const supabase = createClient(
  supabaseUrl,
  isSupabaseConfigured() ? supabaseAnonKey : 'dummy-anon-key'
)

// SQL Schema 가이드 (테이블 및 Storage 버킷 생성)
export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- EUC COMPANY SUPABASE INITIAL SCHEMA & STORAGE BUCKET
-- Supabase SQL Editor에서 실행해 주세요.
-- ========================================================

-- 1. 공지사항 테이블 (notices)
CREATE TABLE IF NOT EXISTS notices (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'schedule',
  category_name TEXT NOT NULL DEFAULT '업무일정',
  badge TEXT NOT NULL DEFAULT '공지',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE,
  summary TEXT,
  content TEXT,
  thumbnail_url TEXT,
  image TEXT,
  views INTEGER DEFAULT 0
);

-- 2. 고객 신청 접수 테이블 (applications)
CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  service_type TEXT NOT NULL, -- 'market_tour', 'rocket_growth', 'purchasing', 'trade'
  service_name TEXT NOT NULL, -- '이우 시장투어', '쿠팡 로켓그로스', '구매대행', '무역대행'
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT '접수대기', -- '접수대기', '상담진행', '견적완료', '처리완료'
  total_amount NUMERIC DEFAULT 0,
  memo TEXT,
  details JSONB DEFAULT '{}'::jsonb
);

-- 3. Row Level Security (RLS) 활성화 및 전체 허용 정책
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all notices" ON notices;
CREATE POLICY "Public all notices" ON notices FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
-- 4. Storage 버킷 (notices) 생성 및 공개 읽기/업로드 정책
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notices', 'notices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public notices bucket select" ON storage.objects;
CREATE POLICY "Public notices bucket select" ON storage.objects FOR SELECT USING (bucket_id = 'notices');

DROP POLICY IF EXISTS "Public notices bucket insert" ON storage.objects;
CREATE POLICY "Public notices bucket insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notices');

DROP POLICY IF EXISTS "Public notices bucket update" ON storage.objects;
CREATE POLICY "Public notices bucket update" ON storage.objects FOR UPDATE USING (bucket_id = 'notices');

DROP POLICY IF EXISTS "Public notices bucket delete" ON storage.objects;
CREATE POLICY "Public notices bucket delete" ON storage.objects FOR DELETE USING (bucket_id = 'notices');

-- 5. 사이트 환경설정 & 환율/수수료/히어로 비주얼 테이블 (site_settings)
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  exchange_rate_mode TEXT DEFAULT 'manual', -- 'manual' | 'auto_margin'
  exchange_rate NUMERIC DEFAULT 195.0,
  rate_margin NUMERIC DEFAULT 1.5,
  agency_fee_rate NUMERIC DEFAULT 8.0,
  sea_cbm_rate NUMERIC DEFAULT 85000,
  customs_clearance_fee NUMERIC DEFAULT 33000,
  fta_co_fee NUMERIC DEFAULT 33000,
  hero_media_type TEXT DEFAULT 'video_mp4', -- 'video_mp4' | 'youtube' | 'image'
  hero_media_url TEXT DEFAULT 'https://assets.mixkit.co/videos/preview/mixkit-cargo-ship-sailing-in-the-ocean-43288-large.mp4',
  hero_overlay_opacity NUMERIC DEFAULT 65
);

INSERT INTO site_settings (id, exchange_rate, agency_fee_rate, sea_cbm_rate, customs_clearance_fee, fta_co_fee, hero_media_type, hero_media_url, hero_overlay_opacity)
VALUES ('default', 195.0, 8.0, 85000, 33000, 33000, 'video_mp4', 'https://assets.mixkit.co/videos/preview/mixkit-cargo-ship-sailing-in-the-ocean-43288-large.mp4', 65)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all site_settings" ON site_settings;
CREATE POLICY "Public all site_settings" ON site_settings FOR ALL USING (true) WITH CHECK (true);
`
