-- ============================================================
-- banners 테이블 v2 마이그레이션
-- 실행 위치: Supabase Dashboard > SQL Editor
-- 주의: banners_schema.sql을 먼저 실행했어야 함
-- ============================================================

-- 1. 신규 컬럼 추가
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS slot        TEXT NOT NULL DEFAULT 'left'
    CHECK (slot IN ('left', 'right')),
  ADD COLUMN IF NOT EXISTS label       TEXT,          -- 상단 라벨 뱃지 (예: B2B CUSTOM MADE)
  ADD COLUMN IF NOT EXISTS heading     TEXT,          -- 카드 큰 제목
  ADD COLUMN IF NOT EXISTS description TEXT,          -- 설명 문구
  ADD COLUMN IF NOT EXISTS button_text TEXT,          -- CTA 버튼 문구
  ADD COLUMN IF NOT EXISTS button_url  TEXT;          -- CTA 버튼 링크 (link_url과 별개)

-- 2. 기존 2개 샘플 데이터 마이그레이션 (삭제 없이 slot만 배정)
-- display_order=1 → OEM/ODM → 왼쪽(left)
UPDATE banners SET
  slot        = 'left',
  label       = 'B2B CUSTOM MADE',
  heading     = 'OEM / ODM 제작관',
  description = '로고 인쇄, 커스텀 패키지, 금형 사출 제작까지 15년 전담 무역 MD가 1:1로 밀착 대행합니다.',
  button_text = '맞춤 제작 상담 신청',
  button_url  = '/services/trade-agent'
WHERE display_order = 1;

-- display_order=2 → 트렌드 신상품 → 오른쪽(right)
UPDATE banners SET
  slot        = 'right',
  label       = '2026 베스트 소싱 기획전',
  heading     = '트렌드 신상품 특가전',
  description = '중국 최고 검증 공장의 신상품을 최저가로 소싱하세요.',
  button_text = '지금 확인하기',
  button_url  = '/mall'
WHERE display_order = 2;

-- 3. slot 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_banners_slot ON banners (slot, display_order ASC);
