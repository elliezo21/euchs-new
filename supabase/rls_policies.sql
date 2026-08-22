-- ==============================================================================
-- EUC COMPANY - SUPABASE ROW LEVEL SECURITY (RLS) 보안 정책 스크립트
-- 배포 전 Supabase SQL Editor에서 실행하여 완벽한 데이터 접근 제어를 적용하세요.
-- ==============================================================================

-- 1. applications 테이블 (구매/무역대행, 시장투어, 로켓그로스 주문 신청서)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;

-- 컬럼 보강 (user_id 컬럼이 없을 경우 자동 추가)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'user_id') THEN
    ALTER TABLE applications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'additional_services') THEN
    ALTER TABLE applications ADD COLUMN additional_services JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 기존 정책 초기화
DROP POLICY IF EXISTS "Anyone can insert applications" ON applications;
DROP POLICY IF EXISTS "Users can view own applications" ON applications;
DROP POLICY IF EXISTS "Users can update own applications" ON applications;
DROP POLICY IF EXISTS "Public all applications" ON applications;

-- [INSERT] 게스트 및 로그인 사용자 누구나 새로운 신청서 제출 가능
CREATE POLICY "Anyone can insert applications"
ON applications
FOR INSERT
WITH CHECK (
  true
);

-- [SELECT] 로그인 사용자는 본인이 작성한 신청서(user_id 또는 email 일치)만 열람 가능
CREATE POLICY "Users can view own applications"
ON applications
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.jwt()->>'email' IS NOT NULL AND auth.jwt()->>'email' = email)
  OR
  (auth.jwt()->>'role' = 'service_role')
);

-- [UPDATE] 로그인 사용자는 본인의 신청서만 수정 가능 (관리자는 전체 수정 가능)
CREATE POLICY "Users can update own applications"
ON applications
FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.jwt()->>'role' = 'service_role')
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.jwt()->>'role' = 'service_role')
);

-- [DELETE] 관리자(service_role) 또는 본인 작성자만 삭제 가능
CREATE POLICY "Users can delete own applications"
ON applications
FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (auth.jwt()->>'role' = 'service_role')
);


-- 2. site_settings 테이블 (환율, 수수료율, 메인 히어로 비주얼 & 4대 서비스 미디어 등)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS site_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS site_settings ADD COLUMN IF NOT EXISTS service_card_media_rocket TEXT DEFAULT '';
ALTER TABLE IF EXISTS site_settings ADD COLUMN IF NOT EXISTS service_card_media_purchasing TEXT DEFAULT '';
ALTER TABLE IF EXISTS site_settings ADD COLUMN IF NOT EXISTS service_card_media_trade TEXT DEFAULT '';
ALTER TABLE IF EXISTS site_settings ADD COLUMN IF NOT EXISTS service_card_media_tour TEXT DEFAULT '';

DROP POLICY IF EXISTS "Public can view site settings" ON site_settings;
DROP POLICY IF EXISTS "Authenticated admins can update site settings" ON site_settings;
DROP POLICY IF EXISTS "Public all site_settings" ON site_settings;

-- [SELECT] 누구나 사이트 환경설정(환율, 수수료, 비디오 배경 등) 조회 가능
CREATE POLICY "Public can view site settings"
ON site_settings
FOR SELECT
USING (true);

-- [ALL] 로그인된 관리자 또는 service_role만 설정값 수정/삽입 가능
CREATE POLICY "Authenticated users can update site settings"
ON site_settings
FOR ALL
USING (
  auth.role() = 'authenticated'
  OR auth.jwt()->>'role' = 'service_role'
)
WITH CHECK (
  auth.role() = 'authenticated'
  OR auth.jwt()->>'role' = 'service_role'
);


-- 3. notices 테이블 (공지사항 및 업무 일정)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view notices" ON notices;
DROP POLICY IF EXISTS "Authenticated users can manage notices" ON notices;
DROP POLICY IF EXISTS "Public all notices" ON notices;

-- [SELECT] 누구나 공지사항 열람 가능
CREATE POLICY "Public can view notices"
ON notices
FOR SELECT
USING (true);

-- [INSERT/UPDATE/DELETE] 로그인된 관리자만 공지사항 작성/수정/삭제 가능
CREATE POLICY "Authenticated users can manage notices"
ON notices
FOR ALL
USING (
  auth.role() = 'authenticated'
  OR auth.jwt()->>'role' = 'service_role'
)
WITH CHECK (
  auth.role() = 'authenticated'
  OR auth.jwt()->>'role' = 'service_role'
);


-- 4. storage.objects (공지사항 썸네일 & 첨부파일 버킷 보안)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notices', 'notices', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public notices bucket select" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated notices bucket upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated notices bucket update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated notices bucket delete" ON storage.objects;

-- 누구나 이미지 열람 가능
CREATE POLICY "Public notices bucket select" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'notices');

-- 인증된 사용자만 이미지 업로드 가능
CREATE POLICY "Authenticated notices bucket upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'notices' 
  AND (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role')
);

-- 인증된 사용자만 이미지 수정/삭제 가능
CREATE POLICY "Authenticated notices bucket update" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'notices' 
  AND (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role')
);

CREATE POLICY "Authenticated notices bucket delete" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'notices' 
  AND (auth.role() = 'authenticated' OR auth.jwt()->>'role' = 'service_role')
);
