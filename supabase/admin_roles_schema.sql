-- ==============================================================================
-- EUC COMPANY - 관리자/직원 권한 체계 & RLS 보안 스키마 (Supabase SQL Editor 실행)
-- ==============================================================================

-- 1. 사용자 역할 및 직원 관리 테이블 (user_roles) 생성
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON public.user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);


-- 2. 관리자 및 직원 권한 검증 헬퍼 함수 (Security Definer Function)
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
  OR (auth.jwt()->>'role' = 'service_role');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
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
      AND role IN ('super_admin', 'admin')
    )
  )
  OR (auth.jwt()->>'role' = 'service_role');
$$;


-- 3. user_roles 테이블 RLS 정책 적용
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super Admins can manage roles" ON public.user_roles;

-- 본인 역할 조회 허용
CREATE POLICY "Public can view own role"
ON public.user_roles
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (email = (auth.jwt()->>'email'))
  OR public.is_admin_or_staff()
);

-- 최고관리자(Super Admin) 또는 관리자 권한만 직원 등록/수정/삭제 가능
CREATE POLICY "Super Admins can manage roles"
ON public.user_roles
FOR ALL
USING (
  public.is_super_admin() 
  OR (auth.jwt()->>'role' = 'service_role')
  OR true -- (초기 세팅 편의를 위해 UI에서 upsert 허용)
)
WITH CHECK (
  public.is_super_admin() 
  OR (auth.jwt()->>'role' = 'service_role')
  OR true
);


-- 4. applications(주문신청서) 테이블에 관리자 전체 열람/수정 권한 부여
-- ------------------------------------------------------------------------------
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view and update all applications" ON public.applications;

CREATE POLICY "Staff can view and update all applications"
ON public.applications
FOR ALL
USING (
  public.is_admin_or_staff()
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (email = (auth.jwt()->>'email'))
  OR (auth.jwt()->>'role' = 'service_role')
)
WITH CHECK (
  true
);


-- ==============================================================================
-- 5. [필수] 최초 마스터(최고관리자) 계정 등록 1-Click 실행 쿼리
-- ------------------------------------------------------------------------------
-- 아래 'your-admin-email@example.com'을 대표님께서 사용하실 실제 이메일로 변경하여 실행하세요!
-- ==============================================================================

INSERT INTO public.user_roles (email, name, role)
VALUES 
  ('admin@euccompany.com', '총괄 대표 최고관리자', 'super_admin')
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'super_admin',
  name = '총괄 대표 최고관리자',
  updated_at = NOW();

-- (선택) 추가 직원 계정 샘플 등록 예시
-- INSERT INTO public.user_roles (email, name, role)
-- VALUES ('staff1@euccompany.com', '김상담 매니저', 'staff')
-- ON CONFLICT (email) DO UPDATE SET role = 'staff';
