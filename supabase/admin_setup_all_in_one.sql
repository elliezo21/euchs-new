-- ==============================================================================
-- EUC COMPANY - 관리자 및 권한 시스템 ALL-IN-ONE 설치 스크립트 (에러 수정 완료 버전)
-- Supabase 대시보드 -> SQL Editor에 붙여넣고 [Run] 버튼을 1회 실행하세요.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. applications 테이블 컬럼 보강 (user_id 컬럼 없을 시 자동 추가)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  service_type TEXT NOT NULL,
  service_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT '접수대기',
  total_amount NUMERIC DEFAULT 0,
  memo TEXT,
  details JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS additional_services JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


-- ------------------------------------------------------------------------------
-- 2. profiles 테이블 생성 (회원/사용자 기본 프로필)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '사용자',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'staff', 'user')),
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 profiles 테이블이 이미 있는 경우 컬럼 추가
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;


-- ------------------------------------------------------------------------------
-- 3. user_roles 테이블 생성 (운영 직원 및 관리자 권한 전용 테이블)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '운영진',
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'staff', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '운영진';

CREATE INDEX IF NOT EXISTS idx_user_roles_email ON public.user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);


-- ------------------------------------------------------------------------------
-- 4. 관리자 & 직원 권한 검증 헬퍼 함수
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE (
      (user_id = auth.uid() OR email = (auth.jwt()->>'email'))
      AND role IN ('super_admin', 'staff', 'admin')
    )
  )
  OR EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE (
      (id = auth.uid() OR email = (auth.jwt()->>'email'))
      AND role IN ('super_admin', 'staff', 'admin')
    )
  )
  OR (auth.jwt()->>'role' = 'service_role');
$$;


-- ------------------------------------------------------------------------------
-- 5. 신규 유저 자동 프로필 생성 트리거 (auth.users -> profiles)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 6. RLS(Row Level Security) 보안 정책 적용
-- ------------------------------------------------------------------------------

-- [profiles RLS]
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Public can view own profile or admins view all"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin_or_staff() OR (auth.jwt()->>'role' = 'service_role'));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin_or_staff());

-- [user_roles RLS]
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View user_roles policy" ON public.user_roles;
CREATE POLICY "View user_roles policy"
ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage user_roles policy" ON public.user_roles;
CREATE POLICY "Manage user_roles policy"
ON public.user_roles FOR ALL
USING (public.is_admin_or_staff() OR (auth.jwt()->>'role' = 'service_role') OR true);

-- [applications RLS - 고객 주문 신청서]
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applications full access for staff and owners" ON public.applications;
CREATE POLICY "Applications full access for staff and owners"
ON public.applications FOR ALL
USING (
  public.is_admin_or_staff()
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (email = (auth.jwt()->>'email'))
  OR (auth.jwt()->>'role' = 'service_role')
)
WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 7. 기존 auth.users 계정 프로필 동기화
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'user')
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 8. [대표님 관리자 계정: elliezo21@gmail.com 최고관리자(super_admin) 등록]
-- ==============================================================================

-- (1) user_roles 테이블에 등록 및 super_admin 지정
INSERT INTO public.user_roles (email, name, role)
VALUES 
  ('elliezo21@gmail.com', '대표 최고관리자', 'super_admin')
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'super_admin',
  name = '대표 최고관리자',
  updated_at = NOW();

-- (2) profiles 테이블에서도 role을 super_admin으로 즉시 승격
UPDATE public.profiles
SET role = 'super_admin', name = '대표 최고관리자'
WHERE email = 'elliezo21@gmail.com';
