-- ==============================================================================
-- EUCHS - banners 테이블 (메인 롤링 배너 관리)
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 실행 횟수: 1회 (IF NOT EXISTS 안전)
-- ==============================================================================

-- 1. banners 테이블 생성
CREATE TABLE IF NOT EXISTS banners (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url      TEXT        NOT NULL,
  link_url       TEXT,
  link_type      TEXT        NOT NULL DEFAULT 'internal'
                             CHECK (link_type IN ('internal', 'external')),
  title          TEXT,
  subtitle       TEXT,
  display_order  INT         NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  start_date     DATE,
  end_date       DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_banner_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_banners_updated_at ON banners;
CREATE TRIGGER trg_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION set_banner_updated_at();

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_banners_display_order ON banners (display_order ASC);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners (is_active) WHERE is_active = true;

-- 4. RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "banners_select_public" ON banners FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "banners_admin_insert" ON banners FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "banners_admin_update" ON banners FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "banners_admin_delete" ON banners FOR DELETE USING (auth.role() = 'authenticated');

-- 5. banners Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('banners','banners',true,5242880,ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 6. 샘플 배너 데이터
INSERT INTO banners (image_url, link_url, link_type, title, display_order, is_active) VALUES
  ('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&fit=crop&q=80','/services/trade-agent','internal','OEM/ODM 맞춤제작 전용관',1,true),
  ('https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&auto=format&fit=crop&q=80','/mall','internal','트렌드 신상품 특가전',2,true)
ON CONFLICT DO NOTHING;
